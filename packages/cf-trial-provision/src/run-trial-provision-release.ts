import { createApiBudget } from "@baser-edge/cf-stack-destroy";
import { ensureD1Database } from "./cloudflare-builds.js";
import { applyTrialMigrations } from "./apply-migrations-runner.js";
import {
  fetchWorkersSubdomain,
  putWorkerScript,
  putWorkerSecrets,
  sleep,
  uploadWorkerAssets,
  workerSubdomainUrl,
  publishWorkerToWorkersDev,
  type AssetManifestEntry,
} from "./deploy-worker.js";
import type { ProgressEvent } from "./cloudflare-builds.js";

export type TrialReleaseManifest = {
  version: string;
  d1DatabaseName: string;
  apiWorkerName: string;
  publicWorkerName: string;
  apiModule: string;
  publicModule: string;
  adminAssets: Record<string, AssetManifestEntry>;
  migrations: { name: string; statements: string[] }[];
};

export type TrialReleaseConfig = {
  accountId: string;
  releaseBaseUrl: string;
  /** Use ASSETS binding for same-origin /trial-release (avoids worker self-fetch 404). */
  httpFetch?: typeof fetch;
};

function releaseUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return `${b}/${p}`;
}

function httpFetch(config: TrialReleaseConfig): typeof fetch {
  return config.httpFetch ?? fetch;
}

export async function fetchTrialReleaseText(config: TrialReleaseConfig, url: string): Promise<string> {
  const res = await httpFetch(config)(url);
  if (!res.ok) throw new Error(`リリースの取得に失敗しました (${res.status}): ${url}`);
  return res.text();
}

export async function fetchTrialReleaseBytes(config: TrialReleaseConfig, url: string): Promise<ArrayBuffer> {
  const res = await httpFetch(config)(url);
  if (!res.ok) throw new Error(`リリースの取得に失敗しました (${res.status}): ${url}`);
  return res.arrayBuffer();
}

export async function loadTrialReleaseManifest(config: TrialReleaseConfig): Promise<TrialReleaseManifest> {
  const raw = await fetchTrialReleaseText(config, releaseUrl(config.releaseBaseUrl, "manifest.json"));
  return JSON.parse(raw) as TrialReleaseManifest;
}

export function randomTrialSecret(bytes = 32): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function bootstrapTrialRemote(apiUrl: string, bootstrapSecret: string): Promise<{
  workspaceId: string;
  siteId: string;
  ownerPrincipalId: string;
} | null> {
  const base = apiUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-bootstrap-secret": bootstrapSecret,
    },
    body: JSON.stringify({
      workspaceName: "baserEdge Demo",
      siteName: "デモサイト",
      hostname: "demo.baseredge.local",
      ownerName: "Owner",
      locale: "ja-JP",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: {
      code?: string;
      message?: string;
      details?: { cause?: string };
    };
  };
  if (!res.ok) {
    if (body?.error?.code === "WORKSPACE_EXISTS") return null;
    const code = body?.error?.code ? ` / ${body.error.code}` : "";
    const detail = body?.error?.details?.cause ?? body?.error?.message;
    throw new Error(`サイト開設 API が失敗しました (${res.status}${code})${detail ? `: ${detail}` : ""}`);
  }
  return body as { workspaceId: string; siteId: string; ownerPrincipalId: string };
}

export async function waitForBootstrapSecret(
  apiUrl: string,
  bootstrapSecret: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<void> {
  const base = apiUrl.replace(/\/$/, "");
  const maxAttempts = options?.maxAttempts ?? 12;
  const delayMs = options?.delayMs ?? 1500;
  let lastStatus = 0;
  let lastCode = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(delayMs);
    try {
      const res = await fetch(`${base}/v1/bootstrap/ready`, {
        method: "POST",
        headers: { "x-baser-bootstrap-secret": bootstrapSecret },
        redirect: "manual",
      });
      if (res.ok) return;
      lastStatus = res.status;
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      lastCode = body.error?.code ?? "";
    } catch {
      lastStatus = 0;
      lastCode = "";
    }
  }

  const detail = [lastStatus || "network", lastCode].filter(Boolean).join(" / ");
  throw new Error(`Bootstrap secret の反映を確認できませんでした (${detail})`);
}

export async function runTrialProvisionRelease(
  token: string,
  config: TrialReleaseConfig,
  onProgress: (event: ProgressEvent) => void | Promise<void>,
): Promise<{ consoleUrl: string; publicUrl: string; apiUrl: string }> {
  const budget = createApiBudget(280);
  const { accountId, releaseBaseUrl } = config;

  onProgress({ step: "provision", message: "データベースを準備しています…" });
  const databaseId = await ensureD1Database(token, accountId, budget);
  const manifest = await loadTrialReleaseManifest(config);

  onProgress({ step: "migrate", message: "データベースを初期化しています…" });
  await applyTrialMigrations(token, accountId, databaseId, manifest.migrations, budget);

  onProgress({ step: "build", message: "お試しサイトを配置しています…（GitHub は不要です）" });
  const apiModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.apiModule));
  const publicModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.publicModule));

  const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
  const apiUrlGuess = workerSubdomainUrl(manifest.apiWorkerName, subdomain ?? undefined);
  const publicUrlGuess = workerSubdomainUrl(manifest.publicWorkerName, subdomain ?? undefined);

  const assetsJwt = await uploadWorkerAssets(
    token,
    accountId,
    manifest.apiWorkerName,
    manifest.adminAssets,
    async (manifestPath) => {
      const rel = manifestPath.replace(/^\//, "");
      return fetchTrialReleaseBytes(config, releaseUrl(releaseBaseUrl, `admin/${rel}`));
    },
    budget,
  );

  const secrets = {
    ASSET_UPLOAD_SECRET: randomTrialSecret(),
    PREVIEW_SECRET: randomTrialSecret(),
    MAIL_FORM_SECRET: randomTrialSecret(),
    MAIL_PRIVACY_SALT: randomTrialSecret(),
    BASER_BOOTSTRAP_SECRET: randomTrialSecret(),
  };

  onProgress({ step: "deploy", message: "Worker を公開しています…" });
  await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
    d1DatabaseId: databaseId,
    workersDev: true,
    vars: {
      SITE_ID: "pending",
      ASSET_BASE_URL: "/assets",
      TURNSTILE_SITE_KEY: "",
    },
  }, budget);

  await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
    d1DatabaseId: databaseId,
    assetsJwt,
    workersDev: true,
    vars: {
      BASER_ENV: "preview",
      PUBLIC_BASE_URL: apiUrlGuess,
      PREVIEW_BASE_URL: publicUrlGuess,
      PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
      BASER_INSTANT_LOGIN: "false",
      BASER_INSTANT_OWNER_HINT: "",
    },
  }, budget);

  const healthUrl = `${apiUrlGuess.replace(/\/$/, "")}/health`;
  await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
  await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, { httpProbeUrl: healthUrl });

  await putWorkerSecrets(token, accountId, manifest.apiWorkerName, secrets, budget);
  await putWorkerSecrets(token, accountId, manifest.publicWorkerName, {
    PREVIEW_SECRET: secrets.PREVIEW_SECRET,
    MAIL_FORM_SECRET: secrets.MAIL_FORM_SECRET,
    MAIL_PRIVACY_SALT: secrets.MAIL_PRIVACY_SALT,
  }, budget);

  onProgress({ step: "bootstrap", message: "サイトを開設しています…" });
  await waitForBootstrapSecret(apiUrlGuess, secrets.BASER_BOOTSTRAP_SECRET);
  const boot = await bootstrapTrialRemote(apiUrlGuess, secrets.BASER_BOOTSTRAP_SECRET);
  const siteId = boot?.siteId ?? "demo";

  const ownerHint = boot
    ? JSON.stringify({
        workspaceId: boot.workspaceId,
        ownerPrincipalId: boot.ownerPrincipalId,
        siteId: boot.siteId,
        siteName: "マイサイト",
        publicUrl: publicUrlGuess.replace(/\/$/, ""),
      })
    : "";

  await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
    d1DatabaseId: databaseId,
    workersDev: true,
    vars: {
      SITE_ID: siteId,
      ASSET_BASE_URL: "/assets",
      TURNSTILE_SITE_KEY: "",
    },
  }, budget);

  await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
    d1DatabaseId: databaseId,
    keepAssets: true,
    workersDev: true,
    vars: {
      BASER_ENV: "preview",
      PUBLIC_BASE_URL: apiUrlGuess,
      PREVIEW_BASE_URL: publicUrlGuess,
      PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
      BASER_INSTANT_LOGIN: boot ? "true" : "false",
      BASER_INSTANT_OWNER_HINT: ownerHint,
    },
  }, budget);

  await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
  await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, { httpProbeUrl: healthUrl });

  const consoleUrl = `${apiUrlGuess.replace(/\/$/, "")}/console/`;
  onProgress({
    step: "succeeded",
    message: "サイトの準備ができました",
    consoleUrl,
    publicUrl: publicUrlGuess,
  });
  return { consoleUrl, publicUrl: publicUrlGuess, apiUrl: apiUrlGuess };
}
