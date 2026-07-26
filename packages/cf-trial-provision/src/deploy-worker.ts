import { CfApiCallError, createApiBudget } from "@baser-edge/cf-stack-destroy";

const CF_API = "https://api.cloudflare.com/client/v4";
const COMPAT_DATE = "2026-07-24";
const SCRIPT_API_DATE = "2025-08-01";
const WORKERS_DEV_ROUTE_MAX_ATTEMPTS = 40;
const WORKERS_DEV_ROUTE_RETRY_DELAY_MS = 1500;

export type AssetManifestEntry = { hash: string; size: number };

export function workerAssetContentType(manifestPath: string): string {
  const path = manifestPath.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const scriptSubdomainHeaders = (): Record<string, string> => ({
  "content-type": "application/json",
  "Cloudflare-Workers-Script-Api-Date": SCRIPT_API_DATE,
});

async function cfJson<T>(
  token: string,
  path: string,
  init: RequestInit,
  budget: ReturnType<typeof createApiBudget>,
): Promise<T> {
  budget.spend(1);
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message?: string; code?: number }[];
    result?: T;
  };
  if (!res.ok || body.success === false) {
    const errors = (body.errors ?? []).map((e) => ({
      code: e.code ?? 0,
      message: e.message ?? "Unknown error",
    }));
    throw new CfApiCallError(errors[0]?.message ?? res.statusText ?? "Cloudflare API error", res.status, errors);
  }
  return body.result as T;
}

export async function uploadWorkerAssets(
  token: string,
  accountId: string,
  scriptName: string,
  manifest: Record<string, AssetManifestEntry>,
  fileLoader: (manifestPath: string) => Promise<ArrayBuffer>,
  budget: ReturnType<typeof createApiBudget>,
): Promise<string> {
  const session = await cfJson<{ jwt?: string; buckets?: string[][] }>(
    token,
    `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/assets-upload-session`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest }),
    },
    budget,
  );
  let uploadJwt = session.jwt;
  if (!uploadJwt) throw new CfApiCallError("assets-upload-session returned no jwt", 500);

  const buckets = session.buckets ?? [];
  const hashToPath = new Map<string, string>();
  for (const [path, meta] of Object.entries(manifest)) {
    hashToPath.set(meta.hash, path);
  }

  for (const bucket of buckets) {
    const form = new FormData();
    for (const hash of bucket) {
      const manifestPath = hashToPath.get(hash);
      if (!manifestPath) throw new Error(`Unknown asset hash in bucket: ${hash}`);
      const bytes = await fileLoader(manifestPath);
      form.append(
        hash,
        new Blob([bytesToBase64(new Uint8Array(bytes))], {
          type: workerAssetContentType(manifestPath),
        }),
        hash,
      );
    }
    budget.spend(1);
    const res = await fetch(
      `${CF_API}/accounts/${accountId}/workers/assets/upload?base64=true`,
      { method: "POST", headers: { Authorization: `Bearer ${uploadJwt}` }, body: form },
    );
    const body = (await res.json()) as { success?: boolean; result?: { jwt?: string }; errors?: { message?: string }[] };
    if (!res.ok || body.success === false) {
      throw new CfApiCallError(body.errors?.[0]?.message ?? "Asset upload failed", res.status);
    }
    if (body.result?.jwt) uploadJwt = body.result.jwt;
  }

  return uploadJwt;
}

export type WorkerDeployBindings = {
  d1DatabaseId: string;
  d1BindingName?: string;
  vars: Record<string, string>;
  assetsJwt?: string;
  /** Reuse the assets already attached to the Worker without consuming another completion token. */
  keepAssets?: boolean;
  assetsBindingName?: string;
  /** Publish to {name}.{account}.workers.dev (required for HTTP invoke after REST upload). */
  workersDev?: boolean;
};

export async function putWorkerScript(
  token: string,
  accountId: string,
  scriptName: string,
  moduleName: string,
  moduleSource: string,
  bindings: WorkerDeployBindings,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  const metadata: Record<string, unknown> = {
    main_module: moduleName,
    compatibility_date: COMPAT_DATE,
    compatibility_flags: ["nodejs_compat"],
    // Script uploads replace omitted bindings unless explicitly retained.
    // Secrets are installed separately, so every later script upload must keep
    // the secret bindings from the previously deployed version.
    keep_bindings: ["secret_text", "secret_key"],
    bindings: [
      {
        type: "d1",
        name: bindings.d1BindingName ?? "DB",
        id: bindings.d1DatabaseId,
      },
    ],
  };

  if (bindings.workersDev) {
    metadata.workers_dev = true;
    metadata.preview_urls = false;
    metadata.subdomain = { enabled: true, previews_enabled: false };
  }

  if (bindings.assetsJwt && bindings.keepAssets) {
    throw new Error("assetsJwt and keepAssets cannot be used together");
  }

  if (bindings.keepAssets) {
    metadata.keep_assets = true;
    // keep_assets retains the uploaded files, but the script upload still
    // replaces omitted bindings. Re-declare the Assets binding or /console/*
    // falls through to authenticated API routing and returns 401.
    metadata.bindings = [
      ...(metadata.bindings as object[]),
      { type: "assets", name: bindings.assetsBindingName ?? "STATIC_ASSETS" },
    ];
  }

  if (bindings.assetsJwt) {
    metadata.assets = {
      jwt: bindings.assetsJwt,
      config: {
        not_found_handling: "single-page-application",
        html_handling: "auto-trailing-slash",
        run_worker_first: true,
      },
    };
    metadata.bindings = [
      ...(metadata.bindings as object[]),
      { type: "assets", name: bindings.assetsBindingName ?? "STATIC_ASSETS" },
    ];
  }

  for (const [name, value] of Object.entries(bindings.vars)) {
    (metadata.bindings as object[]).push({ type: "plain_text", name, text: value });
  }

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append(
    moduleName,
    new Blob([moduleSource], { type: "application/javascript+module" }),
    moduleName,
  );

  budget.spend(1);
  const res = await fetch(
    `${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cloudflare-Workers-Script-Api-Date": SCRIPT_API_DATE,
      },
      body: form,
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message?: string }[];
  };
  if (!res.ok || body.success === false) {
    throw new CfApiCallError(body.errors?.[0]?.message ?? res.statusText ?? "Worker upload failed", res.status);
  }
}

export async function putWorkerSecrets(
  token: string,
  accountId: string,
  scriptName: string,
  secrets: Record<string, string>,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  const entries = Object.entries(secrets);
  if (entries.length === 0) return;
  if (entries.length > 100) {
    throw new Error("A single Cloudflare bulk secret update supports at most 100 secrets");
  }

  budget.spend(1);
  const res = await fetch(
    `${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/secrets-bulk`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/merge-patch+json",
      },
      body: JSON.stringify({
        secrets: Object.fromEntries(entries.map(([name, text]) => [
          name,
          { name, text, type: "secret_text" },
        ])),
      }),
    },
  );
  const body = (await res.json()) as { success?: boolean; errors?: { message?: string }[] };
  if (!res.ok || body.success === false) {
    throw new CfApiCallError(body.errors?.[0]?.message ?? "Bulk secret upload failed", res.status);
  }
}

export async function putWorkerSecret(
  token: string,
  accountId: string,
  scriptName: string,
  name: string,
  value: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  await putWorkerSecrets(token, accountId, scriptName, { [name]: value }, budget);
}

export function workerSubdomainUrl(scriptName: string, subdomain?: string): string {
  if (subdomain) return `https://${scriptName}.${subdomain}.workers.dev`;
  return `https://${scriptName}.workers.dev`;
}

export async function fetchWorkersSubdomain(
  token: string,
  accountId: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<string | null> {
  try {
    const result = await cfJson<{ subdomain?: string }>(
      token,
      `/accounts/${accountId}/workers/subdomain`,
      { method: "GET" },
      budget,
    );
    return result?.subdomain ?? null;
  } catch {
    return null;
  }
}

/** Poll Cloudflare API until workers.dev routing is enabled for this script (no dashboard). */
export async function waitForWorkersDevSubdomainApi(
  token: string,
  accountId: string,
  scriptName: string,
  budget: ReturnType<typeof createApiBudget>,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<void> {
  const path = `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`;
  const maxAttempts = options?.maxAttempts ?? 10;
  const delayMs = options?.delayMs ?? 1500;
  await ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(delayMs);
    if (attempt === 5) {
      await ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget).catch(() => {});
    }
    const check = await cfJson<{ enabled?: boolean }>(
      token,
      path,
      { method: "GET", headers: scriptSubdomainHeaders() },
      budget,
    );
    if (check?.enabled) return;
  }
  throw new CfApiCallError("workers.dev のルートを API で有効にできませんでした", 500);
}

/** Wait until workers.dev route responds (not CF edge 404). */
export async function waitForWorkersDevRoute(
  probeUrl: string,
  options?: {
    maxAttempts?: number;
    delayMs?: number;
    expectedContentTypePrefix?: string;
  },
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? WORKERS_DEV_ROUTE_MAX_ATTEMPTS;
  const delayMs = options?.delayMs ?? WORKERS_DEV_ROUTE_RETRY_DELAY_MS;
  const expectedContentTypePrefix = options?.expectedContentTypePrefix?.toLowerCase();
  const url = probeUrl;
  let lastStatus = 0;
  let lastContentType = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(delayMs);
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      lastStatus = res.status;
      lastContentType = res.headers.get("content-type")?.toLowerCase() ?? "";
      if (
        res.ok
        && (!expectedContentTypePrefix || lastContentType.startsWith(expectedContentTypePrefix))
      ) {
        return;
      }
    } catch {
      /* retry */
    }
  }
  const detail = expectedContentTypePrefix
    ? `status=${lastStatus || "network-error"}, content-type=${lastContentType || "missing"}`
    : `status=${lastStatus || "network-error"}`;
  throw new CfApiCallError(`workers.dev の配信確認に失敗しました (${detail}): ${url}`, lastStatus || 502);
}

/** Enable workers.dev for a script via REST (retries). */
export async function ensureScriptWorkersDevEnabled(
  token: string,
  accountId: string,
  scriptName: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  const path = `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`;
  const headers = scriptSubdomainHeaders();
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(600 * attempt);
    try {
      const created = await cfJson<{ enabled?: boolean }>(
        token,
        path,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ enabled: true, previews_enabled: false }),
        },
        budget,
      );
      if (created?.enabled) return;
      const check = await cfJson<{ enabled?: boolean }>(
        token,
        path,
        { method: "GET", headers },
        budget,
      );
      if (check?.enabled) return;
      throw new CfApiCallError("workers.dev が有効になっていません", 500);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new CfApiCallError("workers.dev の有効化に失敗しました", 500);
}

/** After PUT upload: confirm API + optional HTTP probe (fully automated). */
export async function publishWorkerToWorkersDev(
  token: string,
  accountId: string,
  scriptName: string,
  budget: ReturnType<typeof createApiBudget>,
  options?: {
    httpProbeUrl?: string;
    httpProbeOptions?: {
      maxAttempts?: number;
      delayMs?: number;
      expectedContentTypePrefix?: string;
    };
  },
): Promise<void> {
  await waitForWorkersDevSubdomainApi(token, accountId, scriptName, budget);
  if (options?.httpProbeUrl) {
    await waitForWorkersDevRoute(options.httpProbeUrl, options.httpProbeOptions);
  }
}

/** @deprecated Use ensureScriptWorkersDevEnabled or putWorkerScript with workersDev */
export async function enableWorkersDevSubdomain(
  token: string,
  accountId: string,
  scriptName: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  await ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
