var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const createTokenUrl = "https://dash.cloudflare.com/profile/api-tokens";
const createCustomTokenUrl = "https://dash.cloudflare.com/profile/api-tokens";
const oauth = { "title": "API トークンは不要です。Cloudflare にログインして「Authorize（許可）」を押すだけです。", "steps": ["「Cloudflare でログインしてサイトを開設」を押す", "Cloudflare にログインし、使うアカウントにチェックを入れる", "表示された権限を確認して Authorize（許可）", "このページに戻ると、自動でサイト開設が始まります"], "fallbackSummary": "ログインできないときだけ：手動で API トークン（開発・検証用）", "notConfiguredNote": "お試しサービスを準備しています。しばらくしてから再度お試しください。", "destroyTitle": "削除するには、もう一度 Cloudflare にログインして許可してください（API トークンは不要です）。", "destroyButton": "Cloudflare でログインして削除", "publicUnavailable": "お試しの開設は現在ご利用いただけません。しばらくしてから再度お試しください。" };
const trialNote = "お試し開設では R2（ファイル保存）は作りません。メディアは後から有効化できます。";
const safetyNote = "Cloudflare でログインして許可したあと、ボタンを押したときだけ、あなたの Cloudflare アカウントにリソースが作成・削除されます。許可していなければ何も起きません。";
const tokenGuide = { "summary": "API トークンの作り方（3分・画面の英語表記つき）", "intro": "https://dash.cloudflare.com/profile/api-tokens を開くと、テンプレート一覧と「Create Token」ボタンがあります。テンプレートは使わず、下の手順どおりカスタムトークンを作ってください。", "steps": [{ "title": "Create Token を押す", "body": "ページ右上付近の青い「Create Token」ボタンをクリックします。" }, { "title": "カスタムトークンを選ぶ", "body": "一覧を下までスクロールし、「Create Custom Token」または「Get started」のカード（テンプレートではない方）を選びます。" }, { "title": "名前を付ける", "body": "Token name に「baserEdge お試し」など、あとで分かる名前を入力します。" }, { "title": "権限を3つ追加する", "body": "Permissions で「Add」→「+ Add more」を2回押し、合計3行にします。各行は左から順に次のとおり選びます（ダッシュボードは英語表記です）。" }, { "title": "アカウントの範囲", "body": "Account Resources は「Include」→ あなたのアカウント（または「All accounts」）を選びます。Zone Resources はそのままで構いません。" }, { "title": "作成してコピー", "body": "「Continue to summary」→「Create Token」。表示された長い文字列をコピーし、このページの下の入力欄に貼り付けます。※トークンは一度しか表示されません。" }], "permissionRows": [{ "column1": "Account", "column2": "Workers Scripts", "column3": "Edit", "labelJa": "Worker のデプロイ" }, { "column1": "Account", "column2": "D1", "column3": "Edit", "labelJa": "データベース" }, { "column1": "Account", "column2": "Account Settings", "column3": "Read", "labelJa": "アカウント確認" }], "doNotUse": "「Edit Cloudflare Workers」などのテンプレートだけでは D1 権限が足りないことがあります。必ず上の3行を自分で追加してください。", "afterPaste": "貼り付けが終わったら、このページに戻り「Cloudflare に接続してサイトを開設」を押してください。" };
const permissions = ["Account — Workers Scripts: Edit", "Account — D1: Edit", "Account — Account Settings: Read"];
const steps = [{ "id": "connect", "label": "Cloudflare に接続" }, { "id": "provision", "label": "データベースの作成" }, { "id": "migrate", "label": "データベース初期化" }, { "id": "assets", "label": "管理画面ファイルの準備" }, { "id": "deploy-public", "label": "公開サイト Worker の配置" }, { "id": "deploy-api", "label": "管理 API Worker の配置" }, { "id": "secrets", "label": "認証情報の設定" }, { "id": "bootstrap", "label": "初期サイトの作成" }, { "id": "finalize", "label": "最終設定と動作確認" }, { "id": "succeeded", "label": "完了" }];
const helpJson = {
  createTokenUrl,
  createCustomTokenUrl,
  oauth,
  trialNote,
  safetyNote,
  tokenGuide,
  permissions,
  steps
};
const DEFAULT_BASER_CF_OAUTH_SCOPES = "account-settings.read workers-scripts.write d1.write";
const LEGACY_INVALID_SCOPE = /\b(?:account_settings|workers_scripts)\./;
function resolveBaserCfOAuthScopes(override) {
  const raw = override == null ? void 0 : override.trim();
  return raw || DEFAULT_BASER_CF_OAUTH_SCOPES;
}
function validateOAuthScopeShape(scopes) {
  const s = scopes.trim();
  if (!s) return "BASER_CF_OAUTH_SCOPES が空です";
  if (LEGACY_INVALID_SCOPE.test(s)) {
    return "OAuth scope はハイフン区切りです（account-settings.read workers-scripts.write）";
  }
  return null;
}
const TRIAL_API_WORKER = "baser-edge-api-trial";
const TRIAL_PUBLIC_WORKER = "baser-edge-public-trial";
const TRIAL_D1_NAME = "baser-edge-trial";
class CfApiCallError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    __publicField(this, "status");
    __publicField(this, "errors");
    this.status = status;
    this.errors = errors;
    this.name = "CfApiCallError";
  }
}
function createApiBudget(maxCalls) {
  let remaining = maxCalls;
  return {
    get remaining() {
      return remaining;
    },
    spend(n = 1) {
      if (remaining < n)
        throw new CfApiCallError("API call budget exceeded", 429);
      remaining -= n;
    }
  };
}
const CF_API$3 = "https://api.cloudflare.com/client/v4";
async function cfJson$1(token, path, init, budget) {
  var _a;
  budget.spend(1);
  const res = await fetch(`${CF_API$3}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers ?? {}
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const errors = (body.errors ?? []).map((e) => ({
      code: e.code ?? 0,
      message: e.message ?? "Unknown error"
    }));
    throw new CfApiCallError(((_a = errors[0]) == null ? void 0 : _a.message) ?? res.statusText ?? "Cloudflare API error", res.status, errors);
  }
  return body.result;
}
async function ensureD1Database(token, accountId, budget) {
  const list = await cfJson$1(token, `/accounts/${accountId}/d1/database`, { method: "GET" }, budget);
  const hit = list == null ? void 0 : list.find((db) => db.name === TRIAL_D1_NAME);
  if (hit == null ? void 0 : hit.uuid)
    return hit.uuid;
  const created = await cfJson$1(token, `/accounts/${accountId}/d1/database`, { method: "POST", body: JSON.stringify({ name: TRIAL_D1_NAME }) }, budget);
  if (!(created == null ? void 0 : created.uuid))
    throw new CfApiCallError("D1 create returned no uuid", 500);
  return created.uuid;
}
async function listBuildTriggers(token, accountId, budget, workerScriptId = TRIAL_API_WORKER) {
  try {
    const result = await cfJson$1(token, `/accounts/${accountId}/builds/workers/${encodeURIComponent(workerScriptId)}/triggers`, { method: "GET" }, budget);
    return (result ?? []).map((t) => ({
      uuid: t.trigger_uuid ?? "",
      trigger_name: t.trigger_name
    })).filter((t) => t.uuid);
  } catch (e) {
    if (e instanceof CfApiCallError && e.status === 404)
      return [];
    throw e;
  }
}
async function createBuildTrigger(token, accountId, config, budget) {
  const [owner, repository] = config.buildsRepo.split("/");
  if (!owner || !repository)
    throw new Error(`Invalid buildsRepo: ${config.buildsRepo}`);
  const result = await cfJson$1(token, `/accounts/${accountId}/builds/triggers`, {
    method: "POST",
    body: JSON.stringify({
      trigger_name: "baserEdge trial provision",
      build_command: config.buildCommand,
      deploy_command: config.deployCommand,
      root_directory: config.buildsRootDirectory,
      branch_includes: [config.buildsBranch],
      branch_excludes: [],
      path_includes: ["*"],
      path_excludes: [],
      external_script_id: TRIAL_API_WORKER,
      repo_connection: {
        provider: "github",
        owner,
        repository
      }
    })
  }, budget);
  const triggerUuid = (result == null ? void 0 : result.trigger_uuid) ?? (result == null ? void 0 : result.uuid);
  if (!triggerUuid)
    throw new CfApiCallError("Create build trigger returned no trigger_uuid", 500);
  return triggerUuid;
}
async function startManualBuild(token, accountId, triggerUuid, config, budget) {
  const [owner, repository] = config.buildsRepo.split("/");
  const result = await cfJson$1(token, `/accounts/${accountId}/builds/triggers/${triggerUuid}/builds`, {
    method: "POST",
    body: JSON.stringify({
      branch: config.buildsBranch,
      seed_repo: {
        provider: "github",
        owner,
        repository,
        branch: config.buildsBranch,
        path: config.buildsRootDirectory
      }
    })
  }, budget);
  if (!(result == null ? void 0 : result.build_uuid))
    throw new CfApiCallError("Manual build returned no build_uuid", 500);
  return result.build_uuid;
}
async function getBuildStatus(token, accountId, buildUuid, budget) {
  return cfJson$1(token, `/accounts/${accountId}/builds/builds/${buildUuid}`, { method: "GET" }, budget);
}
function parseConsoleUrlFromLog(text) {
  const m = text.match(/https:\/\/[^\s]+\/console\//);
  return (m == null ? void 0 : m[0]) ?? null;
}
function parseWorkerSubdomainUrl(text, scriptName) {
  const re = new RegExp(`https://${scriptName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\s]*\\.workers\\.dev`, "i");
  const m = text.match(re);
  return (m == null ? void 0 : m[0]) ?? null;
}
const POLL_MS = 8e3;
const MAX_POLLS = 90;
async function runTrialProvision(token, config, onProgress) {
  var _a, _b;
  const budget = createApiBudget(120);
  const { accountId } = config;
  onProgress({ step: "provision", message: "データベースを準備しています…" });
  await ensureD1Database(token, accountId, budget);
  onProgress({ step: "build", message: "利用者の Cloudflare でビルドを開始しています…" });
  let triggers = await listBuildTriggers(token, accountId, budget);
  let triggerUuid = ((_a = triggers.find((t) => {
    var _a2;
    return (_a2 = t.trigger_name) == null ? void 0 : _a2.includes("baserEdge");
  })) == null ? void 0 : _a.uuid) ?? ((_b = triggers[0]) == null ? void 0 : _b.uuid);
  if (!triggerUuid) {
    try {
      triggerUuid = await createBuildTrigger(token, accountId, config, budget);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Workers Builds の設定に失敗しました（workers-ci 権限または GitHub 連携が必要な場合があります）: ${msg}`);
    }
  }
  const buildUuid = await startManualBuild(token, accountId, triggerUuid, config, budget);
  onProgress({ step: "deploy", message: "ビルドとデプロイを実行しています…（数分かかります）" });
  let lastStatus = "";
  let logSnippet = "";
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep$1(POLL_MS);
    const status = await getBuildStatus(token, accountId, buildUuid, budget);
    const st = status.status ?? "unknown";
    if (st !== lastStatus) {
      lastStatus = st;
      onProgress({ step: "deploy", message: `ビルド状態: ${st}` });
    }
    if (status.log_url) {
      try {
        const logRes = await fetch(status.log_url);
        if (logRes.ok)
          logSnippet = await logRes.text();
      } catch {
      }
    }
    if (st === "stopped" || st === "success" || st === "completed")
      break;
    if (st === "failed" || st === "canceled") {
      throw new Error(`Workers Builds が失敗しました（${st}）。Cloudflare ダッシュボードの Builds ログを確認してください。`);
    }
  }
  const consoleUrl = parseConsoleUrlFromLog(logSnippet);
  const apiUrl = parseWorkerSubdomainUrl(logSnippet, TRIAL_API_WORKER);
  const publicUrl = parseWorkerSubdomainUrl(logSnippet, TRIAL_PUBLIC_WORKER);
  if (!consoleUrl && apiUrl) {
    const base = apiUrl.replace(/\/$/, "");
    onProgress({ step: "verify", message: "管理画面の URL を確認しています…", consoleUrl: `${base}/console/` });
    return { consoleUrl: `${base}/console/`, publicUrl: publicUrl ?? apiUrl, apiUrl };
  }
  if (!consoleUrl) {
    throw new Error("ビルドは終了しましたが管理画面 URL を取得できませんでした。Cloudflare ダッシュボードの Workers Builds ログを確認してください。");
  }
  onProgress({
    step: "succeeded",
    message: "サイトの準備ができました",
    consoleUrl,
    publicUrl: publicUrl ?? void 0
  });
  return {
    consoleUrl,
    publicUrl: publicUrl ?? consoleUrl.replace(/\/console\/?$/, ""),
    apiUrl: apiUrl ?? consoleUrl.replace(/\/console\/?$/, "")
  };
}
function sleep$1(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
const CF_API$2 = "https://api.cloudflare.com/client/v4";
const COMPAT_DATE = "2026-07-24";
const SCRIPT_API_DATE = "2025-08-01";
const WORKERS_DEV_ROUTE_MAX_ATTEMPTS = 40;
const WORKERS_DEV_ROUTE_RETRY_DELAY_MS = 1500;
function workerAssetContentType(manifestPath) {
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
function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
const scriptSubdomainHeaders = () => ({
  "content-type": "application/json",
  "Cloudflare-Workers-Script-Api-Date": SCRIPT_API_DATE
});
async function cfJson(token, path, init, budget) {
  var _a;
  budget.spend(1);
  const res = await fetch(`${CF_API$2}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers ?? {}
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const errors = (body.errors ?? []).map((e) => ({
      code: e.code ?? 0,
      message: e.message ?? "Unknown error"
    }));
    throw new CfApiCallError(((_a = errors[0]) == null ? void 0 : _a.message) ?? res.statusText ?? "Cloudflare API error", res.status, errors);
  }
  return body.result;
}
async function uploadWorkerAssets(token, accountId, scriptName, manifest, fileLoader, budget) {
  var _a, _b, _c;
  const session = await cfJson(token, `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/assets-upload-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manifest })
  }, budget);
  let uploadJwt = session.jwt;
  if (!uploadJwt)
    throw new CfApiCallError("assets-upload-session returned no jwt", 500);
  const buckets = session.buckets ?? [];
  const hashToPath = /* @__PURE__ */ new Map();
  for (const [path, meta] of Object.entries(manifest)) {
    hashToPath.set(meta.hash, path);
  }
  for (const bucket of buckets) {
    const form = new FormData();
    for (const hash of bucket) {
      const manifestPath = hashToPath.get(hash);
      if (!manifestPath)
        throw new Error(`Unknown asset hash in bucket: ${hash}`);
      const bytes = await fileLoader(manifestPath);
      form.append(hash, new Blob([bytesToBase64(new Uint8Array(bytes))], {
        type: workerAssetContentType(manifestPath)
      }), hash);
    }
    budget.spend(1);
    const res = await fetch(`${CF_API$2}/accounts/${accountId}/workers/assets/upload?base64=true`, { method: "POST", headers: { Authorization: `Bearer ${uploadJwt}` }, body: form });
    const body = await res.json();
    if (!res.ok || body.success === false) {
      throw new CfApiCallError(((_b = (_a = body.errors) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) ?? "Asset upload failed", res.status);
    }
    if ((_c = body.result) == null ? void 0 : _c.jwt)
      uploadJwt = body.result.jwt;
  }
  return uploadJwt;
}
async function putWorkerScript(token, accountId, scriptName, moduleName, moduleSource, bindings, budget) {
  var _a, _b;
  const metadata = {
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
        id: bindings.d1DatabaseId
      }
    ]
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
    metadata.bindings = [
      ...metadata.bindings,
      { type: "assets", name: bindings.assetsBindingName ?? "STATIC_ASSETS" }
    ];
  }
  if (bindings.assetsJwt) {
    metadata.assets = {
      jwt: bindings.assetsJwt,
      config: {
        not_found_handling: "single-page-application",
        html_handling: "auto-trailing-slash",
        run_worker_first: true
      }
    };
    metadata.bindings = [
      ...metadata.bindings,
      { type: "assets", name: bindings.assetsBindingName ?? "STATIC_ASSETS" }
    ];
  }
  for (const [name, value] of Object.entries(bindings.vars)) {
    metadata.bindings.push({ type: "plain_text", name, text: value });
  }
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append(moduleName, new Blob([moduleSource], { type: "application/javascript+module" }), moduleName);
  budget.spend(1);
  const res = await fetch(`${CF_API$2}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cloudflare-Workers-Script-Api-Date": SCRIPT_API_DATE
    },
    body: form
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new CfApiCallError(((_b = (_a = body.errors) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) ?? res.statusText ?? "Worker upload failed", res.status);
  }
}
async function putWorkerSecrets(token, accountId, scriptName, secrets, budget) {
  var _a, _b;
  const entries = Object.entries(secrets);
  if (entries.length === 0)
    return;
  if (entries.length > 100) {
    throw new Error("A single Cloudflare bulk secret update supports at most 100 secrets");
  }
  budget.spend(1);
  const res = await fetch(`${CF_API$2}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/secrets-bulk`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/merge-patch+json"
    },
    body: JSON.stringify({
      secrets: Object.fromEntries(entries.map(([name, text]) => [
        name,
        { name, text, type: "secret_text" }
      ]))
    })
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new CfApiCallError(((_b = (_a = body.errors) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) ?? "Bulk secret upload failed", res.status);
  }
}
function workerSubdomainUrl(scriptName, subdomain) {
  if (subdomain)
    return `https://${scriptName}.${subdomain}.workers.dev`;
  return `https://${scriptName}.workers.dev`;
}
async function fetchWorkersSubdomain(token, accountId, budget) {
  try {
    const result = await cfJson(token, `/accounts/${accountId}/workers/subdomain`, { method: "GET" }, budget);
    return (result == null ? void 0 : result.subdomain) ?? null;
  } catch {
    return null;
  }
}
async function waitForWorkersDevSubdomainApi(token, accountId, scriptName, budget, options) {
  const path = `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`;
  const maxAttempts = 10;
  const delayMs = 1500;
  await ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0)
      await sleep(delayMs);
    if (attempt === 5) {
      await ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget).catch(() => {
      });
    }
    const check = await cfJson(token, path, { method: "GET", headers: scriptSubdomainHeaders() }, budget);
    if (check == null ? void 0 : check.enabled)
      return;
  }
  throw new CfApiCallError("workers.dev のルートを API で有効にできませんでした", 500);
}
async function waitForWorkersDevRoute(probeUrl, options) {
  var _a, _b;
  const maxAttempts = (options == null ? void 0 : options.maxAttempts) ?? WORKERS_DEV_ROUTE_MAX_ATTEMPTS;
  const delayMs = (options == null ? void 0 : options.delayMs) ?? WORKERS_DEV_ROUTE_RETRY_DELAY_MS;
  const expectedContentTypePrefix = (_a = options == null ? void 0 : options.expectedContentTypePrefix) == null ? void 0 : _a.toLowerCase();
  const url = probeUrl;
  let lastStatus = 0;
  let lastContentType = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0)
      await sleep(delayMs);
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      lastStatus = res.status;
      lastContentType = ((_b = res.headers.get("content-type")) == null ? void 0 : _b.toLowerCase()) ?? "";
      if (res.ok && (!expectedContentTypePrefix || lastContentType.startsWith(expectedContentTypePrefix))) {
        return;
      }
    } catch {
    }
  }
  const detail = expectedContentTypePrefix ? `status=${lastStatus || "network-error"}, content-type=${lastContentType || "missing"}` : `status=${lastStatus || "network-error"}`;
  throw new CfApiCallError(`workers.dev の配信確認に失敗しました (${detail}): ${url}`, lastStatus || 502);
}
async function ensureScriptWorkersDevEnabled(token, accountId, scriptName, budget) {
  const path = `/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`;
  const headers = scriptSubdomainHeaders();
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0)
      await sleep(600 * attempt);
    try {
      const created = await cfJson(token, path, {
        method: "POST",
        headers,
        body: JSON.stringify({ enabled: true, previews_enabled: false })
      }, budget);
      if (created == null ? void 0 : created.enabled)
        return;
      const check = await cfJson(token, path, { method: "GET", headers }, budget);
      if (check == null ? void 0 : check.enabled)
        return;
      throw new CfApiCallError("workers.dev が有効になっていません", 500);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new CfApiCallError("workers.dev の有効化に失敗しました", 500);
}
async function publishWorkerToWorkersDev(token, accountId, scriptName, budget, options) {
  await waitForWorkersDevSubdomainApi(token, accountId, scriptName, budget);
  if (options == null ? void 0 : options.httpProbeUrl) {
    await waitForWorkersDevRoute(options.httpProbeUrl, options.httpProbeOptions);
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
const CF_API$1 = "https://api.cloudflare.com/client/v4";
const RUNNER_SCRIPT = "baser-edge-trial-migrate";
const RUNNER_MODULE = "index.js";
const MIGRATION_STATEMENTS_PER_INVOCATION = 30;
const MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS = 12;
function trialMigrationRunnerSource() {
  return String.raw`
const MAX_STATEMENTS = ${MIGRATION_STATEMENTS_PER_INVOCATION};

async function secretsEqual(provided, expected) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

function json(body, status = 200) {
  return Response.json(body, { status });
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return json({ ok: true, service: "baser-edge-trial-migrate" });
    }
    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const authorization = request.headers.get("Authorization") || "";
    const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expected = typeof env.MIGRATE_RUNNER_SECRET === "string"
      ? env.MIGRATE_RUNNER_SECRET
      : "";
    if (!provided || !expected || !(await secretsEqual(provided, expected))) {
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }
    const statements = body && body.statements;
    if (!Array.isArray(statements) || statements.length === 0) {
      return json({ ok: false, code: "STATEMENTS_REQUIRED" }, 422);
    }
    if (statements.length > MAX_STATEMENTS) {
      return json({ ok: false, code: "TOO_MANY_STATEMENTS" }, 422);
    }
    if (statements.some((statement) => typeof statement !== "string" || !statement.trim())) {
      return json({ ok: false, code: "INVALID_STATEMENT" }, 422);
    }

    let applied = 0;
    let skipped = 0;
    for (let index = 0; index < statements.length; index += 1) {
      const sql = statements[index].trim();
      try {
        await env.DB.prepare(sql).run();
        applied += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/already exists/i.test(message)) {
          skipped += 1;
          continue;
        }
        return json({
          ok: false,
          code: "MIGRATION_STATEMENT_FAILED",
          error: message,
          statementIndex: index,
        }, 500);
      }
    }
    return json({ ok: true, applied, skipped });
  },
};
`.trim();
}
async function d1RequestHttp(token, accountId, databaseId, sql, budget) {
  var _a, _b;
  budget.spend(1);
  const res = await fetch(`${CF_API$1}/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ sql })
  });
  const body = await res.json().catch(() => ({}));
  const failed = (_a = body.result) == null ? void 0 : _a.find((result) => result.success === false);
  if (!res.ok || body.success === false || failed) {
    const errors = (body.errors ?? []).map((error) => ({
      code: error.code ?? 0,
      message: error.message ?? "Unknown D1 error"
    }));
    throw new CfApiCallError(((_b = errors[0]) == null ? void 0 : _b.message) ?? (failed == null ? void 0 : failed.error) ?? res.statusText ?? "D1 query failed", res.status, errors);
  }
  return body.result ?? [];
}
async function d1QueryHttp(token, accountId, databaseId, sql, budget) {
  var _a;
  const result = await d1RequestHttp(token, accountId, databaseId, sql, budget);
  return ((_a = result[0]) == null ? void 0 : _a.results) ?? [];
}
function expectedMigrationSchemaObjects(migrations) {
  const objects = /* @__PURE__ */ new Map();
  for (const migration of migrations) {
    for (const statement of migration.statements) {
      const match = statement.match(/^\s*CREATE\s+(?:UNIQUE\s+)?(VIRTUAL\s+TABLE|TABLE|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][A-Za-z0-9_]*)/i);
      if (!(match == null ? void 0 : match[1]) || !match[2])
        continue;
      const kind = match[1].toUpperCase();
      const type = kind.includes("TABLE") ? "table" : kind === "INDEX" ? "index" : "trigger";
      objects.set(`${type}:${match[2]}`, { type, name: match[2] });
    }
  }
  return [...objects.values()];
}
async function baserEdgeSchemaReady(token, accountId, databaseId, migrations, budget) {
  const expected = expectedMigrationSchemaObjects(migrations);
  if (expected.length === 0)
    return true;
  const names = expected.map(({ name }) => `'${name.replace(/'/g, "''")}'`).join(",");
  const rows = await d1QueryHttp(token, accountId, databaseId, `SELECT type,name FROM sqlite_master WHERE name IN (${names})`, budget);
  const actual = new Set(rows.map((row) => `${String(row.type ?? "")}:${String(row.name ?? "")}`));
  return expected.every(({ type, name }) => actual.has(`${type}:${name}`));
}
function normalizeSql(sql) {
  const t = sql.replace(/\r\n/g, "\n").trim();
  if (!t)
    return t;
  return t.endsWith(";") ? t : `${t};`;
}
function migrationStatements(migrations, mode) {
  const ledgerSql = normalizeSql(`CREATE TABLE IF NOT EXISTS d1_migrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`);
  const statements = [ledgerSql];
  for (const migration of migrations) {
    if (mode === "full") {
      for (const statement of migration.statements) {
        const normalized = normalizeSql(statement);
        if (normalized)
          statements.push(normalized);
      }
    }
    const escaped = migration.name.replace(/'/g, "''");
    statements.push(normalizeSql(`INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${escaped}')`));
  }
  return statements;
}
function trialMigrationStatementCount(migrations, mode) {
  return migrationStatements(migrations, mode).length;
}
async function prepareTrialMigrationRunner(token, accountId, databaseId, migrations, budget) {
  const mode = await baserEdgeSchemaReady(token, accountId, databaseId, migrations, budget) ? "ledger" : "full";
  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);
  const secret = [...secretBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  await putWorkerScript(token, accountId, RUNNER_SCRIPT, RUNNER_MODULE, trialMigrationRunnerSource(), {
    d1DatabaseId: databaseId,
    workersDev: true,
    vars: {}
  }, budget);
  await putWorkerSecrets(token, accountId, RUNNER_SCRIPT, { MIGRATE_RUNNER_SECRET: secret }, budget);
  const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
  if (!subdomain) {
    throw new Error("この Cloudflare アカウントで workers.dev サブドメインが未設定です。Workers の初回セットアップを完了してください。");
  }
  const url = workerSubdomainUrl(RUNNER_SCRIPT, subdomain).replace(/\/$/, "");
  await publishWorkerToWorkersDev(token, accountId, RUNNER_SCRIPT, budget, {
    httpProbeUrl: url,
    httpProbeOptions: { maxAttempts: MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS }
  });
  return { mode, url, secret };
}
async function invokeMigrationRunner(runner, statements, budget) {
  budget.spend(1);
  const res = await fetch(runner.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runner.secret}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ statements })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    const index2 = Number.isInteger(body.statementIndex) ? ` at chunk index ${body.statementIndex}` : "";
    const detail = body.error ?? body.code ?? res.statusText ?? "Unknown migration runner error";
    throw new Error(`マイグレーション Worker が失敗しました (${res.status})${index2}: ${detail}`);
  }
}
async function runTrialMigrationChunk(_token, _accountId, _databaseId, runner, migrations, cursor, budget) {
  const statements = migrationStatements(migrations, runner.mode);
  const chunk = statements.slice(cursor, cursor + MIGRATION_STATEMENTS_PER_INVOCATION);
  if (chunk.length === 0)
    return { nextCursor: cursor, done: true };
  await invokeMigrationRunner(runner, chunk, budget);
  const nextCursor = cursor + chunk.length;
  return { nextCursor, done: nextCursor >= statements.length };
}
async function cleanupTrialMigrationRunner(token, accountId, budget) {
  try {
    budget.spend(1);
    await fetch(`${CF_API$1}/accounts/${accountId}/workers/scripts/${encodeURIComponent(RUNNER_SCRIPT)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
  }
}
async function applyTrialMigrations(token, accountId, databaseId, migrations, budget) {
  const runner = await prepareTrialMigrationRunner(token, accountId, databaseId, migrations, budget);
  let cursor = 0;
  try {
    while (true) {
      const chunk = await runTrialMigrationChunk(token, accountId, databaseId, runner, migrations, cursor, budget);
      cursor = chunk.nextCursor;
      if (chunk.done)
        break;
    }
  } finally {
    await cleanupTrialMigrationRunner(token, accountId, budget);
  }
}
function releaseUrl$1(base, path) {
  const b = base.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return `${b}/${p}`;
}
function httpFetch(config) {
  return config.httpFetch ?? fetch;
}
async function fetchTrialReleaseText(config, url) {
  const res = await httpFetch(config)(url);
  if (!res.ok)
    throw new Error(`リリースの取得に失敗しました (${res.status}): ${url}`);
  return res.text();
}
async function fetchTrialReleaseBytes(config, url) {
  const res = await httpFetch(config)(url);
  if (!res.ok)
    throw new Error(`リリースの取得に失敗しました (${res.status}): ${url}`);
  return res.arrayBuffer();
}
async function loadTrialReleaseManifest(config) {
  const raw = await fetchTrialReleaseText(config, releaseUrl$1(config.releaseBaseUrl, "manifest.json"));
  return JSON.parse(raw);
}
function randomTrialSecret(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  let s = "";
  for (const b of a)
    s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function bootstrapTrialRemote(apiUrl, bootstrapSecret) {
  var _a, _b, _c, _d, _e;
  const base = apiUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-bootstrap-secret": bootstrapSecret
    },
    body: JSON.stringify({
      workspaceName: "baserEdge Demo",
      siteName: "デモサイト",
      hostname: "demo.baseredge.local",
      ownerName: "Owner",
      locale: "ja-JP"
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (((_a = body == null ? void 0 : body.error) == null ? void 0 : _a.code) === "WORKSPACE_EXISTS")
      return null;
    const code = ((_b = body == null ? void 0 : body.error) == null ? void 0 : _b.code) ? ` / ${body.error.code}` : "";
    const detail = ((_d = (_c = body == null ? void 0 : body.error) == null ? void 0 : _c.details) == null ? void 0 : _d.cause) ?? ((_e = body == null ? void 0 : body.error) == null ? void 0 : _e.message);
    throw new Error(`サイト開設 API が失敗しました (${res.status}${code})${detail ? `: ${detail}` : ""}`);
  }
  return body;
}
async function waitForBootstrapSecret(apiUrl, bootstrapSecret, options) {
  var _a;
  const base = apiUrl.replace(/\/$/, "");
  const maxAttempts = (options == null ? void 0 : options.maxAttempts) ?? 12;
  const delayMs = (options == null ? void 0 : options.delayMs) ?? 1500;
  let lastStatus = 0;
  let lastCode = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0)
      await sleep(delayMs);
    try {
      const res = await fetch(`${base}/v1/bootstrap/ready`, {
        method: "POST",
        headers: { "x-baser-bootstrap-secret": bootstrapSecret },
        redirect: "manual"
      });
      if (res.ok)
        return;
      lastStatus = res.status;
      const body = await res.json().catch(() => ({}));
      lastCode = ((_a = body.error) == null ? void 0 : _a.code) ?? "";
    } catch {
      lastStatus = 0;
      lastCode = "";
    }
  }
  const detail = [lastStatus || "network", lastCode].filter(Boolean).join(" / ");
  throw new Error(`Bootstrap secret の反映を確認できませんでした (${detail})`);
}
async function runTrialProvisionRelease(token, config, onProgress) {
  const budget = createApiBudget(280);
  const { accountId, releaseBaseUrl } = config;
  onProgress({ step: "provision", message: "データベースを準備しています…" });
  const databaseId = await ensureD1Database(token, accountId, budget);
  const manifest = await loadTrialReleaseManifest(config);
  onProgress({ step: "migrate", message: "データベースを初期化しています…" });
  await applyTrialMigrations(token, accountId, databaseId, manifest.migrations, budget);
  onProgress({ step: "build", message: "お試しサイトを配置しています…（GitHub は不要です）" });
  const apiModule = await fetchTrialReleaseText(config, releaseUrl$1(releaseBaseUrl, manifest.apiModule));
  const publicModule = await fetchTrialReleaseText(config, releaseUrl$1(releaseBaseUrl, manifest.publicModule));
  const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
  const apiUrlGuess = workerSubdomainUrl(manifest.apiWorkerName, subdomain ?? void 0);
  const publicUrlGuess = workerSubdomainUrl(manifest.publicWorkerName, subdomain ?? void 0);
  const assetsJwt = await uploadWorkerAssets(token, accountId, manifest.apiWorkerName, manifest.adminAssets, async (manifestPath) => {
    const rel = manifestPath.replace(/^\//, "");
    return fetchTrialReleaseBytes(config, releaseUrl$1(releaseBaseUrl, `admin/${rel}`));
  }, budget);
  const secrets = {
    ASSET_UPLOAD_SECRET: randomTrialSecret(),
    PREVIEW_SECRET: randomTrialSecret(),
    MAIL_FORM_SECRET: randomTrialSecret(),
    MAIL_PRIVACY_SALT: randomTrialSecret(),
    BASER_BOOTSTRAP_SECRET: randomTrialSecret()
  };
  onProgress({ step: "deploy", message: "Worker を公開しています…" });
  await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
    d1DatabaseId: databaseId,
    workersDev: true,
    vars: {
      SITE_ID: "pending",
      ASSET_BASE_URL: "/assets",
      TURNSTILE_SITE_KEY: ""
    }
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
      BASER_INSTANT_OWNER_HINT: ""
    }
  }, budget);
  const healthUrl = `${apiUrlGuess.replace(/\/$/, "")}/health`;
  await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
  await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, { httpProbeUrl: healthUrl });
  await putWorkerSecrets(token, accountId, manifest.apiWorkerName, secrets, budget);
  await putWorkerSecrets(token, accountId, manifest.publicWorkerName, {
    PREVIEW_SECRET: secrets.PREVIEW_SECRET,
    MAIL_FORM_SECRET: secrets.MAIL_FORM_SECRET,
    MAIL_PRIVACY_SALT: secrets.MAIL_PRIVACY_SALT
  }, budget);
  onProgress({ step: "bootstrap", message: "サイトを開設しています…" });
  await waitForBootstrapSecret(apiUrlGuess, secrets.BASER_BOOTSTRAP_SECRET);
  const boot = await bootstrapTrialRemote(apiUrlGuess, secrets.BASER_BOOTSTRAP_SECRET);
  const siteId = (boot == null ? void 0 : boot.siteId) ?? "demo";
  const ownerHint = boot ? JSON.stringify({
    workspaceId: boot.workspaceId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteId: boot.siteId,
    siteName: "マイサイト",
    publicUrl: publicUrlGuess.replace(/\/$/, "")
  }) : "";
  await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
    d1DatabaseId: databaseId,
    workersDev: true,
    vars: {
      SITE_ID: siteId,
      ASSET_BASE_URL: "/assets",
      TURNSTILE_SITE_KEY: ""
    }
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
      BASER_INSTANT_OWNER_HINT: ownerHint
    }
  }, budget);
  await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
  await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, { httpProbeUrl: healthUrl });
  const consoleUrl = `${apiUrlGuess.replace(/\/$/, "")}/console/`;
  onProgress({
    step: "succeeded",
    message: "サイトの準備ができました",
    consoleUrl,
    publicUrl: publicUrlGuess
  });
  return { consoleUrl, publicUrl: publicUrlGuess, apiUrl: apiUrlGuess };
}
const TRIAL_PROVISION_STEP_API_BUDGET = 35;
const TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS = 12;
const TRIAL_PROVISION_SECRET_PROBE_ATTEMPTS = 12;
function trialProvisionStageProgress(stage) {
  switch (stage) {
    case "prepare":
      return progress("provision", "Cloudflare D1 データベースを準備しています…");
    case "prepare-migrations":
    case "migrate":
    case "cleanup-migrations":
      return progress("migrate", "データベースを初期化しています…");
    case "upload-assets":
      return progress("assets", "管理画面ファイルを準備しています…");
    case "deploy-public-initial":
      return progress("deploy-public", "公開サイト Worker を配置しています…");
    case "deploy-api-initial":
      return progress("deploy-api", "管理 API Worker を配置しています…");
    case "secrets":
    case "verify-bootstrap-secret":
      return progress("secrets", "サイトの認証情報を設定しています…");
    case "bootstrap":
      return progress("bootstrap", "初期サイトと管理者を作成しています…");
    case "deploy-public-final":
    case "deploy-api-final":
      return progress("finalize", "最終設定を反映し、動作を確認しています…");
  }
}
function requiredString(state, key) {
  const value = state[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`開設チェックポイントが不正です (${state.stage}.${key})`);
  }
  return value;
}
function requiredSecrets(state) {
  if (!state.secrets)
    throw new Error(`開設チェックポイントが不正です (${state.stage}.secrets)`);
  return state.secrets;
}
function releaseUrl(base, path) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
function progress(step, message) {
  return { step, message };
}
async function runTrialProvisionReleaseStep(token, config, input) {
  var _a;
  const state = input ?? { stage: "prepare" };
  const budget = createApiBudget(TRIAL_PROVISION_STEP_API_BUDGET);
  const { accountId, releaseBaseUrl } = config;
  switch (state.stage) {
    case "prepare": {
      const databaseId = await ensureD1Database(token, accountId, budget);
      return {
        done: false,
        state: { stage: "prepare-migrations", databaseId },
        progress: progress("provision", "データベースを準備しました")
      };
    }
    case "prepare-migrations": {
      const databaseId = requiredString(state, "databaseId");
      const manifest = await loadTrialReleaseManifest(config);
      const migrationRunner = await prepareTrialMigrationRunner(token, accountId, databaseId, manifest.migrations, budget);
      return {
        done: false,
        state: { stage: "migrate", databaseId, migrationRunner, migrationCursor: 0 },
        progress: progress("migrate", "データベースを初期化しています…")
      };
    }
    case "migrate": {
      const databaseId = requiredString(state, "databaseId");
      if (!state.migrationRunner) {
        throw new Error("開設チェックポイントが不正です (migrate.migrationRunner)");
      }
      const cursor = state.migrationCursor ?? 0;
      const manifest = await loadTrialReleaseManifest(config);
      const chunk = await runTrialMigrationChunk(token, accountId, databaseId, state.migrationRunner, manifest.migrations, cursor, budget);
      const total = trialMigrationStatementCount(manifest.migrations, state.migrationRunner.mode);
      return {
        done: false,
        state: chunk.done ? { stage: "cleanup-migrations", databaseId } : {
          stage: "migrate",
          databaseId,
          migrationRunner: state.migrationRunner,
          migrationCursor: chunk.nextCursor
        },
        progress: progress("migrate", `データベースを初期化しています… (${Math.min(chunk.nextCursor, total)}/${total})`)
      };
    }
    case "cleanup-migrations": {
      const databaseId = requiredString(state, "databaseId");
      await cleanupTrialMigrationRunner(token, accountId, budget);
      return {
        done: false,
        state: { stage: "upload-assets", databaseId },
        progress: progress("migrate", "データベースの初期化が完了しました")
      };
    }
    case "upload-assets": {
      const databaseId = requiredString(state, "databaseId");
      const manifest = await loadTrialReleaseManifest(config);
      const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
      if (!subdomain) {
        throw new Error("この Cloudflare アカウントで workers.dev サブドメインが未設定です。Workers の初回セットアップを完了してください。");
      }
      const apiUrl = workerSubdomainUrl(manifest.apiWorkerName, subdomain);
      const publicUrl = workerSubdomainUrl(manifest.publicWorkerName, subdomain);
      await uploadWorkerAssets(token, accountId, manifest.apiWorkerName, manifest.adminAssets, async (manifestPath) => {
        const rel = manifestPath.replace(/^\//, "");
        return fetchTrialReleaseBytes(config, releaseUrl(releaseBaseUrl, `admin/${rel}`));
      }, budget);
      const secrets = {
        ASSET_UPLOAD_SECRET: randomTrialSecret(),
        PREVIEW_SECRET: randomTrialSecret(),
        MAIL_FORM_SECRET: randomTrialSecret(),
        MAIL_PRIVACY_SALT: randomTrialSecret(),
        BASER_BOOTSTRAP_SECRET: randomTrialSecret()
      };
      return {
        done: false,
        state: {
          stage: "deploy-public-initial",
          databaseId,
          apiUrl,
          publicUrl,
          secrets
        },
        progress: progress("build", "管理画面の配布物を準備しました")
      };
    }
    case "deploy-public-initial": {
      const databaseId = requiredString(state, "databaseId");
      const publicUrl = requiredString(state, "publicUrl");
      requiredString(state, "apiUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const publicModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.publicModule));
      await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
        d1DatabaseId: databaseId,
        workersDev: true,
        vars: {
          SITE_ID: "pending",
          ASSET_BASE_URL: "/assets",
          TURNSTILE_SITE_KEY: ""
        }
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
      return {
        done: false,
        state: { ...state, stage: "deploy-api-initial" },
        progress: progress("deploy", `公開Workerを配置しました (${publicUrl})`)
      };
    }
    case "deploy-api-initial": {
      const databaseId = requiredString(state, "databaseId");
      const apiUrl = requiredString(state, "apiUrl");
      const publicUrl = requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const apiModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.apiModule));
      const assetsJwt = await uploadWorkerAssets(token, accountId, manifest.apiWorkerName, manifest.adminAssets, async (manifestPath) => {
        const rel = manifestPath.replace(/^\//, "");
        return fetchTrialReleaseBytes(config, releaseUrl(releaseBaseUrl, `admin/${rel}`));
      }, budget);
      await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
        d1DatabaseId: databaseId,
        assetsJwt,
        workersDev: true,
        vars: {
          BASER_ENV: "preview",
          PUBLIC_BASE_URL: apiUrl,
          PREVIEW_BASE_URL: publicUrl,
          PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
          BASER_INSTANT_LOGIN: "false",
          BASER_INSTANT_OWNER_HINT: ""
        }
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, {
        httpProbeUrl: `${apiUrl.replace(/\/$/, "")}/console/`,
        httpProbeOptions: {
          maxAttempts: TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS,
          expectedContentTypePrefix: "text/html"
        }
      });
      return {
        done: false,
        state: { ...state, stage: "secrets" },
        progress: progress("deploy", "API Workerを配置しました")
      };
    }
    case "secrets": {
      const secrets = requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      await putWorkerSecrets(token, accountId, manifest.apiWorkerName, secrets, budget);
      await putWorkerSecrets(token, accountId, manifest.publicWorkerName, {
        PREVIEW_SECRET: secrets.PREVIEW_SECRET,
        MAIL_FORM_SECRET: secrets.MAIL_FORM_SECRET,
        MAIL_PRIVACY_SALT: secrets.MAIL_PRIVACY_SALT
      }, budget);
      return {
        done: false,
        state: { ...state, stage: "verify-bootstrap-secret" },
        progress: progress("bootstrap", "サイト開設用の認証情報を反映しています…")
      };
    }
    case "verify-bootstrap-secret": {
      const apiUrl = requiredString(state, "apiUrl");
      requiredString(state, "databaseId");
      requiredString(state, "publicUrl");
      const secrets = requiredSecrets(state);
      await waitForBootstrapSecret(apiUrl, secrets.BASER_BOOTSTRAP_SECRET, {
        maxAttempts: TRIAL_PROVISION_SECRET_PROBE_ATTEMPTS
      });
      return {
        done: false,
        state: { ...state, stage: "bootstrap" },
        progress: progress("bootstrap", "サイト開設用の認証情報を確認しました")
      };
    }
    case "bootstrap": {
      const apiUrl = requiredString(state, "apiUrl");
      requiredString(state, "databaseId");
      requiredString(state, "publicUrl");
      const secrets = requiredSecrets(state);
      const bootstrap = await bootstrapTrialRemote(apiUrl, secrets.BASER_BOOTSTRAP_SECRET);
      return {
        done: false,
        state: { ...state, stage: "deploy-public-final", bootstrap },
        progress: progress("bootstrap", "初期サイトを作成しました")
      };
    }
    case "deploy-public-final": {
      const databaseId = requiredString(state, "databaseId");
      requiredString(state, "apiUrl");
      requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const publicModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.publicModule));
      await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
        d1DatabaseId: databaseId,
        workersDev: true,
        vars: {
          SITE_ID: ((_a = state.bootstrap) == null ? void 0 : _a.siteId) ?? "demo",
          ASSET_BASE_URL: "/assets",
          TURNSTILE_SITE_KEY: ""
        }
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
      return {
        done: false,
        state: { ...state, stage: "deploy-api-final" },
        progress: progress("deploy", "公開サイトを確定しました")
      };
    }
    case "deploy-api-final": {
      const databaseId = requiredString(state, "databaseId");
      const apiUrl = requiredString(state, "apiUrl");
      const publicUrl = requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const apiModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.apiModule));
      const ownerHint = state.bootstrap ? JSON.stringify({
        workspaceId: state.bootstrap.workspaceId,
        ownerPrincipalId: state.bootstrap.ownerPrincipalId,
        siteId: state.bootstrap.siteId,
        siteName: "マイサイト",
        publicUrl: publicUrl.replace(/\/$/, "")
      }) : "";
      await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
        d1DatabaseId: databaseId,
        keepAssets: true,
        workersDev: true,
        vars: {
          BASER_ENV: "preview",
          PUBLIC_BASE_URL: apiUrl,
          PREVIEW_BASE_URL: publicUrl,
          PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
          BASER_INSTANT_LOGIN: state.bootstrap ? "true" : "false",
          BASER_INSTANT_OWNER_HINT: ownerHint
        }
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, {
        httpProbeUrl: `${apiUrl.replace(/\/$/, "")}/console/`,
        httpProbeOptions: {
          maxAttempts: TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS,
          expectedContentTypePrefix: "text/html"
        }
      });
      const consoleUrl = `${apiUrl.replace(/\/$/, "")}/console/`;
      return {
        done: true,
        result: { consoleUrl, publicUrl, apiUrl },
        progress: {
          step: "succeeded",
          message: "サイトの準備ができました",
          consoleUrl,
          publicUrl
        }
      };
    }
  }
}
class TrialProvisionQueueMessageError extends Error {
  constructor(message) {
    super(message);
    __publicField(this, "code", "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE");
    this.name = "TrialProvisionQueueMessageError";
  }
}
function fail(message) {
  throw new TrialProvisionQueueMessageError(message);
}
function parseTrialProvisionQueueMessage(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("Queue message must be an object");
  }
  const body = input;
  if (body.version !== 1)
    fail("Queue message version must be 1");
  const sessionId = String(body.sessionId ?? "");
  if (!/^[a-f0-9]{24}$/.test(sessionId)) {
    fail("Queue message sessionId is invalid");
  }
  const accountId = String(body.accountId ?? "");
  if (!/^[a-f0-9]{32}$/.test(accountId)) {
    fail("Queue message accountId is invalid");
  }
  const requestOrigin2 = String(body.requestOrigin ?? "");
  let origin;
  try {
    origin = new URL(requestOrigin2);
  } catch {
    fail("Queue message requestOrigin is invalid");
  }
  if (origin.protocol !== "https:" || origin.origin !== requestOrigin2 || origin.username || origin.password) {
    fail("Queue message requestOrigin must be an HTTPS origin");
  }
  const encryptedApiToken = String(body.encryptedApiToken ?? "");
  if (encryptedApiToken.length < 40 || encryptedApiToken.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(encryptedApiToken)) {
    fail("Queue message encryptedApiToken is invalid");
  }
  const encryptedState = body.encryptedState === void 0 ? void 0 : String(body.encryptedState);
  if (encryptedState !== void 0 && (encryptedState.length < 40 || encryptedState.length > 16384 || !/^[A-Za-z0-9_-]+$/.test(encryptedState))) {
    fail("Queue message encryptedState is invalid");
  }
  return {
    version: 1,
    sessionId,
    accountId,
    requestOrigin: requestOrigin2,
    encryptedApiToken,
    ...encryptedState ? { encryptedState } : {}
  };
}
function decodeBase64(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
function encodeBase64url(bytes) {
  let value = "";
  for (const byte of bytes)
    value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return decodeBase64(padded);
}
function encryptionKeyBytes(base64Key) {
  const key = decodeBase64(base64Key.trim());
  if (key.length !== 32)
    throw new Error("ONBOARDING_TOKEN_ENCRYPTION_KEY invalid");
  return key;
}
async function encryptTrialProvisionToken(base64Key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(base64Key), "AES-GCM", false, ["encrypt"]);
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, encoded));
  const tag = cipher.slice(-16);
  const data = cipher.slice(0, -16);
  const packed = new Uint8Array(12 + 16 + data.length);
  packed.set(iv, 0);
  packed.set(tag, 12);
  packed.set(data, 28);
  return encodeBase64url(packed);
}
async function decryptTrialProvisionToken(base64Key, packedToken) {
  const packed = decodeBase64url(packedToken);
  if (packed.length < 29)
    throw new Error("Encrypted onboarding token is invalid");
  const iv = packed.slice(0, 12);
  const tag = packed.slice(12, 28);
  const data = packed.slice(28);
  const cipher = new Uint8Array(data.length + tag.length);
  cipher.set(data, 0);
  cipher.set(tag, data.length);
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(base64Key), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, cipher);
  return new TextDecoder().decode(plain);
}
function provisionMode(env) {
  var _a;
  const v = (_a = env.BASER_TRIAL_PROVISION_MODE) == null ? void 0 : _a.trim().toLowerCase();
  if (v === "github" || v === "github_actions") return "github";
  return "cloudflare";
}
function provisionStrategy(env) {
  var _a;
  const v = (_a = env.BASER_TRIAL_PROVISION_STRATEGY) == null ? void 0 : _a.trim().toLowerCase();
  if (v === "builds" || v === "workers_builds") return "builds";
  return "release";
}
function trialReleaseBaseUrl(env, requestOrigin2) {
  var _a;
  const configured = (_a = env.BASER_TRIAL_RELEASE_BASE_URL) == null ? void 0 : _a.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${requestOrigin2.replace(/\/$/, "")}/trial-release`;
}
function trialBuildsConfig(env, accountId) {
  var _a, _b, _c, _d, _e, _f;
  const repo = ((_a = env.BASER_TRIAL_BUILDS_REPO) == null ? void 0 : _a.trim()) || ((_b = env.GITHUB_REPO) == null ? void 0 : _b.trim()) || "imagawatatsuya/baser-edge";
  const branch = ((_c = env.BASER_TRIAL_BUILDS_BRANCH) == null ? void 0 : _c.trim()) || "main";
  return {
    accountId,
    buildsRepo: repo,
    buildsBranch: branch,
    buildsRootDirectory: ((_d = env.BASER_TRIAL_BUILDS_ROOT) == null ? void 0 : _d.trim()) || "/",
    buildCommand: ((_e = env.BASER_TRIAL_BUILDS_BUILD_CMD) == null ? void 0 : _e.trim()) || "npm ci && npm run build && npm run build:admin-web",
    deployCommand: ((_f = env.BASER_TRIAL_BUILDS_DEPLOY_CMD) == null ? void 0 : _f.trim()) || "node deploy/one-click/deploy.mjs"
  };
}
function createTrialReleaseFetch(assets, origin) {
  const originUrl = new URL(origin.replace(/\/$/, "") + "/");
  return async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    if (url.origin === originUrl.origin && url.pathname.startsWith("/trial-release/")) {
      return assets.fetch(new Request(url.toString(), req));
    }
    return fetch(req);
  };
}
async function runCloudflareProvisionJob(env, apiToken, accountId, requestOrigin2, patch, releaseFetch) {
  try {
    await patch({ status: "running", step: "connect", message: "Cloudflare に接続しました" });
    const strategy = provisionStrategy(env);
    if (strategy === "release") {
      await runTrialProvisionRelease(
        apiToken,
        {
          accountId,
          releaseBaseUrl: trialReleaseBaseUrl(env, requestOrigin2),
          httpFetch: releaseFetch
        },
        async (event) => {
          await patch({
            status: event.step === "succeeded" ? "succeeded" : "running",
            step: event.step,
            message: event.message ?? "",
            consoleUrl: event.consoleUrl ?? null,
            publicUrl: event.publicUrl ?? null
          });
        }
      );
    } else {
      await runTrialProvision(apiToken, trialBuildsConfig(env, accountId), async (event) => {
        await patch({
          status: event.step === "succeeded" ? "succeeded" : "running",
          step: event.step,
          message: event.message ?? "",
          consoleUrl: event.consoleUrl ?? null,
          publicUrl: event.publicUrl ?? null
        });
      });
    }
  } catch (e) {
    let message = e instanceof Error ? e.message : String(e);
    if (message === "Not found") {
      message = "Cloudflare API がリソースを見つけられませんでした。お試しをやめる → 再開設をお試しください。";
    }
    console.error(JSON.stringify({
      event: "trial_provision_failed",
      strategy: provisionStrategy(env),
      accountIdSuffix: accountId.slice(-6),
      error: message
    }));
    await patch({
      status: "failed",
      step: "failed",
      message: "開設に失敗しました",
      error: message
    }).catch(() => {
    });
  }
}
const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const CF_API = "https://api.cloudflare.com/client/v4";
const GRANT_TTL = 15 * 60;
const SESSION_TTL = 24 * 60 * 60;
const LEGACY_SESSION_STALE_MS = 2 * 60 * 1e3;
const QUEUED_SESSION_STALE_MS = 16 * 60 * 1e3;
function publicTrial(env) {
  var _a;
  const v = (_a = env.BASER_ONBOARDING_PUBLIC) == null ? void 0 : _a.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}
function oauthConfigured(env) {
  var _a, _b;
  return Boolean(((_a = env.BASER_CF_OAUTH_CLIENT_ID) == null ? void 0 : _a.trim()) && ((_b = env.BASER_CF_OAUTH_CLIENT_SECRET) == null ? void 0 : _b.trim()));
}
function oauthScopes(env) {
  return resolveBaserCfOAuthScopes(env.BASER_CF_OAUTH_SCOPES);
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(), ...extra }
  });
}
function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-onboarding-secret"
  };
}
function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location, ...corsHeaders() } });
}
function requestOrigin(req) {
  var _a, _b;
  const url = new URL(req.url);
  const proto = ((_b = (_a = req.headers.get("x-forwarded-proto")) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim()) || url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}
function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded == null ? void 0 : forwarded.trim()) return forwarded.split(",")[0].trim();
  return "unknown";
}
async function rateLimited(req, env, route) {
  const limit = Number(env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN ?? 30);
  const key = `rl:${clientIp(req)}:${route}`;
  const raw = await env.ONBOARDING_KV.get(key);
  const now = Date.now();
  let count = 0;
  let resetAt = now + 6e4;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.resetAt > now) {
      count = parsed.count;
      resetAt = parsed.resetAt;
    }
  }
  count += 1;
  await env.ONBOARDING_KV.put(key, JSON.stringify({ count, resetAt }), { expirationTtl: 120 });
  if (count > limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1e3));
    return json(
      { error: { message: "リクエストが多すぎます。しばらくしてから再度お試しください。" } },
      429,
      { "retry-after": String(retryAfter) }
    );
  }
  return null;
}
function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}
async function encryptToken(env, plaintext) {
  return encryptTrialProvisionToken(env.ONBOARDING_TOKEN_ENCRYPTION_KEY, plaintext);
}
async function decryptToken(env, packedToken) {
  return decryptTrialProvisionToken(env.ONBOARDING_TOKEN_ENCRYPTION_KEY, packedToken);
}
async function takeGrant(env, id) {
  const token = await env.ONBOARDING_KV.get(`grant:${id}`);
  if (token) await env.ONBOARDING_KV.delete(`grant:${id}`);
  return token;
}
async function issueGrant(env, accessToken) {
  const id = randomHex(16);
  await env.ONBOARDING_KV.put(`grant:${id}`, accessToken, { expirationTtl: GRANT_TTL });
  return id;
}
async function saveSession(env, session) {
  session.updatedAt = Date.now();
  await env.ONBOARDING_KV.put(`session:${session.id}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
}
async function loadSession(env, id) {
  const raw = await env.ONBOARDING_KV.get(`session:${id}`);
  if (!raw) return null;
  return JSON.parse(raw);
}
async function listAccounts(token) {
  var _a, _b;
  const res = await fetch(`${CF_API}/accounts`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!body.success) throw new Error(((_b = (_a = body.errors) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) ?? "アカウント一覧の取得に失敗しました");
  const accounts = body.result ?? [];
  if (!accounts.length) throw new Error("このトークンで利用できる Cloudflare アカウントがありません");
  return accounts;
}
async function dispatchGithub(env, eventType, clientPayload) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "baser-edge-onboarding-worker"
    },
    body: JSON.stringify({ event_type: eventType, client_payload: clientPayload })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed: ${res.status} ${text}`);
  }
}
function newStackId() {
  return `ob-${randomHex(12)}`;
}
function provisionStackId(env) {
  var _a;
  const fixed = (_a = env.BASER_ONBOARDING_PROVISION_STACK_ID) == null ? void 0 : _a.trim().toLowerCase();
  if (!fixed) return newStackId();
  if (fixed === "trial") return "trial";
  throw new Error(`BASER_ONBOARDING_PROVISION_STACK_ID "${fixed}" is not allowed`);
}
async function resolveApiToken(env, body) {
  const grantId = String(body.oauthGrantId ?? "").trim();
  const manual = String(body.cloudflareApiToken ?? "").trim();
  if (publicTrial(env) && manual && !grantId) {
    throw new Error("お試しでは Cloudflare ログインから操作してください（API トークンの貼り付けはできません）。");
  }
  if (grantId) {
    const token = await takeGrant(env, grantId);
    if (!token) {
      throw new Error("Cloudflare 接続の有効期限が切れました。もう一度「Cloudflare でログイン」からやり直してください。");
    }
    return token;
  }
  if (!manual) throw new Error("Cloudflare に接続してください（ログイン）");
  return manual;
}
async function patchSessionById(env, sessionId, body) {
  const session = await loadSession(env, sessionId);
  if (!session) return;
  Object.assign(session, body);
  await saveSession(env, session);
}
async function startProveJob(env, req, apiToken) {
  var _a, _b, _c, _d;
  const accounts = await listAccounts(apiToken);
  const accountId = (_a = accounts[0]) == null ? void 0 : _a.id;
  if (!accountId) throw new Error("Cloudflare アカウント ID を取得できませんでした");
  const mode = provisionMode(env);
  const stackId = provisionStackId(env);
  const sessionId = randomHex(12);
  const session = {
    id: sessionId,
    status: "queued",
    step: "queued",
    message: "開設を準備しています…",
    stackId,
    accountName: ((_b = accounts[0]) == null ? void 0 : _b.name) ?? null,
    consoleUrl: null,
    publicUrl: null,
    error: null,
    runner: mode === "github" ? "github" : "queue",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await saveSession(env, session);
  if (mode === "github") {
    if (!((_c = env.GITHUB_REPO) == null ? void 0 : _c.trim()) || !((_d = env.GH_DISPATCH_TOKEN) == null ? void 0 : _d.trim())) {
      throw new Error("お試しの開設ジョブが未設定です（BASER_TRIAL_PROVISION_MODE=github）");
    }
    const ciphertext = await encryptToken(env, apiToken);
    const origin = requestOrigin(req);
    await dispatchGithub(env, "onboarding-prove", {
      sessionId,
      stackId,
      ciphertext,
      callbackUrl: `${origin}/api/onboarding/internal/progress`
    });
    await saveSession(env, { ...session, status: "running", step: "connect", message: "Cloudflare に接続しました" });
  } else {
    const requestOriginValue = requestOrigin(req);
    const encryptedApiToken = await encryptToken(env, apiToken);
    try {
      await env.TRIAL_PROVISION_QUEUE.send({
        version: 1,
        sessionId,
        accountId,
        requestOrigin: requestOriginValue,
        encryptedApiToken
      });
    } catch (error) {
      await patchSessionById(env, sessionId, {
        status: "failed",
        step: "failed",
        message: "開設ジョブを開始できませんでした",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  return json(
    {
      sessionId,
      stackId,
      accountName: session.accountName,
      status: mode === "github" ? "running" : "queued",
      provisionMode: mode
    },
    202
  );
}
function queuedMessageSessionId(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const sessionId = String(input.sessionId ?? "");
  return /^[a-f0-9]{24}$/.test(sessionId) ? sessionId : null;
}
async function consumeTrialProvisionMessage(message, env) {
  let body;
  try {
    body = parseTrialProvisionQueueMessage(message.body);
  } catch (error) {
    const sessionId = queuedMessageSessionId(message.body);
    if (sessionId) {
      await patchSessionById(env, sessionId, {
        status: "failed",
        step: "failed",
        message: "開設ジョブの形式が正しくありません",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    console.error(JSON.stringify({
      event: "trial_provision_queue_invalid",
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error)
    }));
    message.ack();
    return;
  }
  const session = await loadSession(env, body.sessionId);
  if (!session || session.status === "succeeded" || session.status === "failed") {
    message.ack();
    return;
  }
  const currentCheckpoint = session.provisionState ?? void 0;
  if (body.encryptedState !== currentCheckpoint) {
    if (currentCheckpoint) {
      await env.TRIAL_PROVISION_QUEUE.send({
        version: 1,
        sessionId: body.sessionId,
        accountId: body.accountId,
        requestOrigin: body.requestOrigin,
        encryptedApiToken: body.encryptedApiToken,
        encryptedState: currentCheckpoint
      });
    }
    message.ack();
    return;
  }
  try {
    const apiToken = await decryptToken(env, body.encryptedApiToken);
    if (provisionStrategy(env) === "release") {
      const packedState = session.provisionState ?? body.encryptedState;
      let provisionState;
      if (packedState) {
        const parsed = JSON.parse(await decryptToken(env, packedState));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("開設チェックポイントを復元できません");
        }
        provisionState = parsed;
      }
      const currentProgress = trialProvisionStageProgress((provisionState == null ? void 0 : provisionState.stage) ?? "prepare");
      await patchSessionById(env, body.sessionId, {
        status: "running",
        step: currentProgress.step,
        message: currentProgress.message ?? "",
        error: null
      });
      const result = await runTrialProvisionReleaseStep(
        apiToken,
        {
          accountId: body.accountId,
          releaseBaseUrl: trialReleaseBaseUrl(env, body.requestOrigin),
          httpFetch: createTrialReleaseFetch(env.ASSETS, body.requestOrigin)
        },
        provisionState
      );
      if (result.done) {
        await patchSessionById(env, body.sessionId, {
          status: "succeeded",
          step: result.progress.step,
          message: result.progress.message ?? "サイトの準備ができました",
          consoleUrl: result.result.consoleUrl,
          publicUrl: result.result.publicUrl,
          error: null,
          provisionState: null
        });
      } else {
        const nextProvisionState = await encryptToken(env, JSON.stringify(result.state));
        const nextProgress = result.state.stage === (provisionState == null ? void 0 : provisionState.stage) ? result.progress : trialProvisionStageProgress(result.state.stage);
        await patchSessionById(env, body.sessionId, {
          status: "running",
          step: nextProgress.step,
          message: nextProgress.message ?? "",
          error: null,
          provisionState: nextProvisionState
        });
        await env.TRIAL_PROVISION_QUEUE.send({
          version: 1,
          sessionId: body.sessionId,
          accountId: body.accountId,
          requestOrigin: body.requestOrigin,
          encryptedApiToken: body.encryptedApiToken,
          encryptedState: nextProvisionState
        });
      }
    } else {
      await runCloudflareProvisionJob(
        env,
        apiToken,
        body.accountId,
        body.requestOrigin,
        (patch) => patchSessionById(env, body.sessionId, patch),
        createTrialReleaseFetch(env.ASSETS, body.requestOrigin)
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (message.attempts < 3) {
      await patchSessionById(env, body.sessionId, {
        status: "running",
        message: "開設処理を再試行しています…",
        error: null
      }).catch(() => {
      });
      console.warn(JSON.stringify({
        event: "trial_provision_queue_retry",
        messageId: message.id,
        sessionId: body.sessionId,
        attempt: message.attempts,
        error: errorMessage
      }));
      message.retry({ delaySeconds: 2 });
      return;
    }
    await patchSessionById(env, body.sessionId, {
      status: "failed",
      step: "failed",
      message: "開設に失敗しました",
      error: errorMessage
    });
    console.error(JSON.stringify({
      event: "trial_provision_queue_failed",
      messageId: message.id,
      sessionId: body.sessionId,
      attempt: message.attempts,
      error: errorMessage
    }));
  }
  message.ack();
}
async function failStaleSession(env, session) {
  if (session.status === "succeeded" || session.status === "failed") return session;
  const maxIdleMs = session.runner === "queue" ? QUEUED_SESSION_STALE_MS : session.runner === "github" ? 30 * 60 * 1e3 : LEGACY_SESSION_STALE_MS;
  if (Date.now() - session.updatedAt <= maxIdleMs) return session;
  const legacy = !session.runner;
  const failed = {
    ...session,
    status: "failed",
    step: "failed",
    message: "開設処理が停止しました",
    error: legacy ? "旧方式のバックグラウンド処理が停止しました。もう一度開設を実行してください。" : "開設処理の進捗が長時間更新されませんでした。もう一度開設を実行してください。"
  };
  await saveSession(env, failed);
  return failed;
}
function oauthClientIdSuffix(env) {
  var _a;
  const id = (_a = env.BASER_CF_OAUTH_CLIENT_ID) == null ? void 0 : _a.trim();
  if (!id || id.length < 8) return void 0;
  return id.slice(-4);
}
async function handleApi(req, env, url) {
  var _a, _b;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  const oauthOn = oauthConfigured(env);
  const ready = !publicTrial(env) || oauthOn;
  if (url.pathname === "/api/onboarding/health") {
    const scopes = oauthOn ? oauthScopes(env) : void 0;
    const oauthScopeConfigError = scopes ? validateOAuthScopeShape(scopes) : null;
    return json(
      {
        ok: ready && !oauthScopeConfigError,
        service: "baser-edge-onboarding",
        oauthEnabled: oauthOn,
        publicTrial: publicTrial(env),
        ready: ready && !oauthScopeConfigError,
        host: "cloudflare-worker",
        oauthClientIdSuffix: oauthOn ? oauthClientIdSuffix(env) : void 0,
        oauthScopes: scopes,
        oauthScopeConfigError: oauthScopeConfigError ?? void 0,
        trialProvisionMode: provisionMode(env),
        trialProvisionStrategy: provisionStrategy(env)
      },
      ready && !oauthScopeConfigError ? 200 : 503
    );
  }
  if (url.pathname.startsWith("/api/onboarding/trial-release/") && req.method === "GET") {
    const suffix = url.pathname.slice("/api/onboarding/trial-release/".length);
    const assetPath = `/trial-release/${suffix}`;
    const assetReq = new Request(new URL(assetPath, url.origin), req);
    const res = await env.ASSETS.fetch(assetReq);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  }
  if (url.pathname === "/api/onboarding/help") {
    const provisionFixed = ((_a = env.BASER_ONBOARDING_PROVISION_STACK_ID) == null ? void 0 : _a.trim().toLowerCase()) || null;
    const teardownUrl = ((_b = env.BASER_EDGE_OPS_PUBLIC_URL) == null ? void 0 : _b.trim()) || void 0;
    const help = {
      ...helpJson,
      oauthEnabled: oauthOn,
      publicTrial: publicTrial(env),
      ready,
      provisionStackId: provisionFixed === "trial" ? "trial" : void 0,
      teardownUrl
    };
    return json(help);
  }
  if (!ready) {
    return json(
      { error: { message: "お試しの開設サービスは現在ご利用いただけません。しばらくしてから再度お試しください。" } },
      503
    );
  }
  if (url.pathname === "/api/onboarding/internal/progress" && req.method === "POST") {
    if (req.headers.get("x-onboarding-secret") !== env.ONBOARDING_CALLBACK_SECRET) {
      return json({ error: { message: "Forbidden" } }, 403);
    }
    const body = await req.json();
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId) return json({ error: { message: "sessionId required" } }, 400);
    const session = await loadSession(env, sessionId);
    if (!session) return json({ error: { message: "session not found" } }, 404);
    Object.assign(session, {
      status: body.status ?? session.status,
      step: body.step ?? session.step,
      message: body.message ?? session.message,
      consoleUrl: body.consoleUrl ?? session.consoleUrl,
      publicUrl: body.publicUrl ?? session.publicUrl,
      error: body.error ?? session.error
    });
    await saveSession(env, session);
    return json({ ok: true });
  }
  if (url.pathname === "/api/onboarding/oauth/start" && req.method === "GET") {
    const limited = await rateLimited(req, env, "oauth-start");
    if (limited) return limited;
    const scopeStr = oauthScopes(env);
    const scopeError = validateOAuthScopeShape(scopeStr);
    if (scopeError) {
      return json({ error: { message: scopeError } }, 500);
    }
    const intent = url.searchParams.get("intent") === "destroy" ? "destroy" : "deploy";
    const redirectUri = `${requestOrigin(req)}/api/onboarding/oauth/callback`;
    const state = randomHex(16);
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = await pkceChallenge(verifier);
    await env.ONBOARDING_KV.put(`oauth:${state}`, JSON.stringify({ verifier, intent }), { expirationTtl: GRANT_TTL });
    const params = new URLSearchParams({
      client_id: env.BASER_CF_OAUTH_CLIENT_ID.trim(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: oauthScopes(env),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256"
    });
    return redirect(`${AUTH_URL}?${params.toString()}`);
  }
  if (url.pathname === "/api/onboarding/oauth/callback" && req.method === "GET") {
    const ui = requestOrigin(req);
    try {
      const err = url.searchParams.get("error");
      if (err) {
        const desc = url.searchParams.get("error_description") ?? err;
        return redirect(`${ui}/start/?oauth_error=${encodeURIComponent(desc)}`);
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("OAuth コールバックが不完全です");
      const pendingRaw = await env.ONBOARDING_KV.get(`oauth:${state}`);
      if (!pendingRaw) throw new Error("セッションの有効期限が切れました。もう一度お試しください。");
      await env.ONBOARDING_KV.delete(`oauth:${state}`);
      const pending = JSON.parse(pendingRaw);
      const redirectUri = `${requestOrigin(req)}/api/onboarding/oauth/callback`;
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env.BASER_CF_OAUTH_CLIENT_ID.trim(),
        client_secret: env.BASER_CF_OAUTH_CLIENT_SECRET.trim(),
        code_verifier: pending.verifier
      });
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error_description || tokenJson.error || "OAuth token failed");
      }
      const grantId = await issueGrant(env, tokenJson.access_token);
      const intentQ = pending.intent === "destroy" ? "&oauth_intent=destroy" : "";
      return redirect(`${ui}/start/?oauth_grant=${grantId}${intentQ}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return redirect(`${ui}/start/?oauth_error=${encodeURIComponent(msg)}`);
    }
  }
  if (url.pathname === "/api/onboarding/sessions" && req.method === "POST") {
    const limited = await rateLimited(req, env, "sessions");
    if (limited) return limited;
    try {
      const body = await req.json();
      const token = await resolveApiToken(env, body);
      return await startProveJob(env, req, token);
    } catch (e) {
      return json({ error: { message: e instanceof Error ? e.message : String(e) } }, 400);
    }
  }
  if (url.pathname === "/api/onboarding/destroy" && req.method === "POST") {
    const limited = await rateLimited(req, env, "destroy");
    if (limited) return limited;
    try {
      const body = await req.json();
      const token = await resolveApiToken(env, body);
      const stackId = String(body.stackId ?? "").trim();
      if (!stackId || !stackId.startsWith("ob-") || stackId.length < 10) {
        return json({ error: { message: "スタック ID の形式が正しくありません（ob-…）" } }, 400);
      }
      const ciphertext = await encryptToken(env, token);
      await dispatchGithub(env, "onboarding-destroy", { stackId, ciphertext });
      return json({ ok: true, message: `お試しサイト（${stackId}）の削除を開始しました。完了まで少しお待ちください。` });
    } catch (e) {
      return json({ error: { message: e instanceof Error ? e.message : String(e) } }, 400);
    }
  }
  const sessionMatch = url.pathname.match(/^\/api\/onboarding\/sessions\/([a-f0-9]+)$/);
  if (sessionMatch && req.method === "GET") {
    const loaded = await loadSession(env, sessionMatch[1]);
    const session = loaded ? await failStaleSession(env, loaded) : null;
    if (!session) return json({ error: { message: "セッションが見つかりません" } }, 404);
    return json({
      id: session.id,
      status: session.status,
      step: session.step,
      message: session.message,
      consoleUrl: session.consoleUrl ?? void 0,
      publicUrl: session.publicUrl ?? void 0,
      accountName: session.accountName ?? void 0,
      stackId: session.stackId,
      error: session.error ?? void 0
    });
  }
  return json({ error: { message: "Not found" } }, 404);
}
const index = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}/start/`, 302);
    }
    if (url.pathname.startsWith("/api/onboarding")) {
      return handleApi(req, env, url);
    }
    return env.ASSETS.fetch(req);
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      await consumeTrialProvisionMessage(message, env);
    }
  }
};
export {
  index as default
};
