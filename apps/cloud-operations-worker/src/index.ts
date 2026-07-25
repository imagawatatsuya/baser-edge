import {
  TRIAL_STACK_ID,
  destroyTrialStack,
  resolveSingleAccountId,
  DestroyTrialError,
} from "@baser-edge/cf-stack-destroy";

export interface Env {
  OPS_KV: KVNamespace;
  BASER_CF_OAUTH_CLIENT_ID: string;
  BASER_CF_OAUTH_CLIENT_SECRET: string;
  BASER_CF_OAUTH_SCOPES?: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY?: string;
  BASER_OPS_DISABLED?: string;
  BASER_OPS_DRY_RUN?: string;
  BASER_OPS_GLOBAL_TEARDOWN_PER_DAY?: string;
  BASER_OPS_IP_OAUTH_START_PER_HOUR?: string;
  BASER_OPS_IP_OAUTH_CALLBACK_PER_HOUR?: string;
  BASER_OPS_ACCOUNT_TEARDOWN_PER_DAY?: string;
  BASER_OPS_MAX_R2_DELETES?: string;
  BASER_OPS_MAX_CF_API_CALLS?: string;
}

const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const STATE_TTL = 15 * 60;

function opsDisabled(env: Env): boolean {
  const v = env.BASER_OPS_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function dryRun(env: Env): boolean {
  const v = env.BASER_OPS_DRY_RUN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function oauthScopes(env: Env): string {
  return env.BASER_CF_OAUTH_SCOPES?.trim() || "account:read workers_scripts:edit d1:edit";
}

function numEnv(env: Env, key: keyof Env, fallback: number): number {
  const raw = env[key];
  const n = Number(typeof raw === "string" ? raw : fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded?.trim()) return forwarded.split(",")[0].trim();
  return "unknown";
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

async function accountIdHash(accountId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accountId));
  return base64url(new Uint8Array(digest)).slice(0, 16);
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type WindowCounter = { count: number; resetAt: number };

async function incrementWindow(
  kv: KVNamespace,
  key: string,
  windowMs: number,
  ttlSec: number,
): Promise<WindowCounter> {
  const now = Date.now();
  const raw = await kv.get(key);
  let count = 0;
  let resetAt = now + windowMs;
  if (raw) {
    const parsed = JSON.parse(raw) as WindowCounter;
    if (parsed.resetAt > now) {
      count = parsed.count;
      resetAt = parsed.resetAt;
    }
  }
  count += 1;
  await kv.put(key, JSON.stringify({ count, resetAt }), { expirationTtl: ttlSec });
  return { count, resetAt };
}

async function rateLimitIp(
  env: Env,
  req: Request,
  route: string,
  maxPerHour: number,
): Promise<Response | null> {
  const key = `rl:ip:${clientIp(req)}:${route}`;
  const { count, resetAt } = await incrementWindow(env.OPS_KV, key, 3_600_000, 7200);
  if (count > maxPerHour) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return html(
      "リクエストが多すぎます",
      `<p>しばらくしてから再度お試しください。</p>`,
      429,
      { "retry-after": String(retryAfter) },
    );
  }
  return null;
}

async function rateLimitGlobalTeardownStart(env: Env): Promise<Response | null> {
  const max = numEnv(env, "BASER_OPS_GLOBAL_TEARDOWN_PER_DAY", 500);
  const key = `cap:global:${utcDayKey()}`;
  const { count } = await incrementWindow(env.OPS_KV, key, 86_400_000, 172_800);
  if (count > max) {
    logEvent("teardown.denied", { reason: "global_cap" });
    return html("サービスが混み合っています", `<p>本日の上限に達しました。明日再度お試しください。</p>`, 503);
  }
  return null;
}

async function rateLimitAccountTeardown(env: Env, accountId: string): Promise<Response | null> {
  const max = numEnv(env, "BASER_OPS_ACCOUNT_TEARDOWN_PER_DAY", 3);
  const hash = await accountIdHash(accountId);
  const key = `cap:acct:${hash}:${utcDayKey()}`;
  const { count } = await incrementWindow(env.OPS_KV, key, 86_400_000, 172_800);
  if (count > max) {
    logEvent("teardown.denied", { reason: "account_cap", accountHash: hash });
    return html(
      "本日の削除回数の上限に達しました",
      `<p>同じ Cloudflare アカウントでは 1 日に ${max} 回までです。</p>`,
      429,
    );
  }
  return null;
}

async function acquireAccountJob(env: Env, accountId: string): Promise<boolean> {
  const hash = await accountIdHash(accountId);
  const key = `job:acct:${hash}`;
  const existing = await env.OPS_KV.get(key);
  if (existing) return false;
  await env.OPS_KV.put(key, "1", { expirationTtl: 900 });
  return true;
}

async function releaseAccountJob(env: Env, accountId: string): Promise<void> {
  const hash = await accountIdHash(accountId);
  await env.OPS_KV.delete(`job:acct:${hash}`);
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, requestId: fields.requestId ?? randomHex(8), ...fields }));
}

function html(title: string, body: string, status = 200, extra: Record<string, string> = {}): Response {
  const page = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — baserEdge</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    .warn { background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    button { font-size: 1rem; padding: 0.6rem 1.2rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
  <p><a href="/">トップへ戻る</a></p>
</body>
</html>`;
  return new Response(page, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...extra },
  });
}

function landingPage(env: Env): Response {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() || "";
  const turnstileScript = siteKey
    ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`
    : "";
  const widget = siteKey
    ? `<div class="cf-turnstile" data-sitekey="${siteKey}"></div>`
  : `<p class="warn">Turnstile が未設定のため、本番では利用できません。</p>`;

  return html(
    "お試しサイトをやめる",
    `<p>baserEdge の<strong>お試し</strong>（Cloudflare 上の trial スタック）を削除します。管理画面と公開サイトは使えなくなり、<strong>復元できません</strong>。</p>
<div class="warn">削除対象: お試し用 Worker・D1・（あれば）R2 のみ。他の Cloudflare リソースには触れません。</div>
<form method="post" action="/v1/teardown/oauth/start">
  ${widget}
  <p><button type="submit">Cloudflare で確認して削除する</button></p>
</form>
${turnstileScript}`,
  );
}

async function verifyTurnstile(env: Env, token: string, ip: string): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return false;
  const form = new URLSearchParams({ secret, response: token, remoteip: ip });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

async function parseTurnstileFromRequest(req: Request): Promise<string> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json()) as { turnstileToken?: string; "cf-turnstile-response"?: string };
    return String(body.turnstileToken ?? body["cf-turnstile-response"] ?? "").trim();
  }
  const form = await req.formData();
  return String(form.get("cf-turnstile-response") ?? "").trim();
}

function oauthConfigured(env: Env): boolean {
  return Boolean(env.BASER_CF_OAUTH_CLIENT_ID?.trim() && env.BASER_CF_OAUTH_CLIENT_SECRET?.trim());
}

async function handleOAuthStart(req: Request, env: Env): Promise<Response> {
  if (opsDisabled(env)) {
    return html("メンテナンス中", `<p>現在、お試しの削除は停止しています。</p>`, 503);
  }
  if (!oauthConfigured(env)) {
    return html("設定エラー", `<p>OAuth が構成されていません。</p>`, 503);
  }

  const limited = await rateLimitIp(
    env,
    req,
    "oauth-start",
    numEnv(env, "BASER_OPS_IP_OAUTH_START_PER_HOUR", 20),
  );
  if (limited) return limited;

  const globalCap = await rateLimitGlobalTeardownStart(env);
  if (globalCap) return globalCap;

  const turnstile = await parseTurnstileFromRequest(req);
  const ok = await verifyTurnstile(env, turnstile, clientIp(req));
  if (!ok) {
    logEvent("teardown.denied", { reason: "turnstile" });
    return html("確認に失敗しました", `<p>ボット確認（Turnstile）に失敗しました。ページを再読み込みして再度お試しください。</p>`, 422);
  }

  const origin = requestOrigin(req);
  const redirectUri = `${origin}/v1/teardown/oauth/callback`;
  const state = randomHex(16);
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = await pkceChallenge(verifier);
  await env.OPS_KV.put(`oauth:${state}`, JSON.stringify({ verifier }), { expirationTtl: STATE_TTL });

  const params = new URLSearchParams({
    client_id: env.BASER_CF_OAUTH_CLIENT_ID.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: oauthScopes(env),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  logEvent("teardown.requested", { stackId: TRIAL_STACK_ID, stage: "oauth_start" });
  return Response.redirect(`${AUTH_URL}?${params.toString()}`, 302);
}

async function handleOAuthCallback(req: Request, env: Env, url: URL): Promise<Response> {
  if (opsDisabled(env)) {
    return html("メンテナンス中", `<p>現在、お試しの削除は停止しています。</p>`, 503);
  }

  const limited = await rateLimitIp(
    env,
    req,
    "oauth-callback",
    numEnv(env, "BASER_OPS_IP_OAUTH_CALLBACK_PER_HOUR", 30),
  );
  if (limited) return limited;

  const err = url.searchParams.get("error");
  if (err) {
    const desc = url.searchParams.get("error_description") ?? err;
    return html("認証がキャンセルされました", `<p>${escapeHtml(desc)}</p>`, 400);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return html("認証エラー", `<p>OAuth コールバックが不完全です。</p>`, 400);
  }

  const pendingRaw = await env.OPS_KV.get(`oauth:${state}`);
  if (!pendingRaw) {
    return html("セッション期限切れ", `<p>もう一度トップからやり直してください。</p>`, 400);
  }
  await env.OPS_KV.delete(`oauth:${state}`);
  const pending = JSON.parse(pendingRaw) as { verifier: string };

  const origin = requestOrigin(req);
  const redirectUri = `${origin}/v1/teardown/oauth/callback`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.BASER_CF_OAUTH_CLIENT_ID.trim(),
    client_secret: env.BASER_CF_OAUTH_CLIENT_SECRET.trim(),
    code_verifier: pending.verifier,
  });

  let accessToken: string;
  try {
    const tokenRes = await fetch(TOKEN_URL, { method: "POST", body });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || tokenJson.error || "OAuth token failed");
    }
    accessToken = tokenJson.access_token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logEvent("teardown.denied", { reason: "oauth_token", message: msg });
    return html("認証エラー", `<p>${escapeHtml(msg)}</p>`, 400);
  }

  let accountId: string;
  try {
    accountId = await resolveSingleAccountId(accessToken, 5);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return html("アカウント確認エラー", `<p>${escapeHtml(msg)}</p>`, 422);
  }

  const acctLimited = await rateLimitAccountTeardown(env, accountId);
  if (acctLimited) return acctLimited;

  const acquired = await acquireAccountJob(env, accountId);
  if (!acquired) {
    return html("処理中", `<p>同じアカウントで別の削除が進行中です。完了後に再度お試しください。</p>`, 409);
  }

  const accountHash = await accountIdHash(accountId);
  const requestId = randomHex(8);
  const maxR2 = numEnv(env, "BASER_OPS_MAX_R2_DELETES", 200);
  const maxApi = numEnv(env, "BASER_OPS_MAX_CF_API_CALLS", 50);
  const isDry = dryRun(env);

  try {
    const result = await destroyTrialStack(accessToken, accountId, TRIAL_STACK_ID, {
      dryRun: isDry,
      maxApiCalls: maxApi,
      maxR2ObjectDeletes: maxR2,
    });

    logEvent("teardown.completed", {
      requestId,
      stackId: TRIAL_STACK_ID,
      accountHash,
      dryRun: isDry,
      partialR2: result.partialR2,
      apiCallsUsed: result.apiCallsUsed,
    });

    let detail = `<ul>
<li>API Worker: ${result.removed.apiWorker ? "削除" : "なし / スキップ"}</li>
<li>公開 Worker: ${result.removed.publicWorker ? "削除" : "なし / スキップ"}</li>
<li>D1: ${result.removed.d1 ? "削除" : "なし / スキップ"}</li>
<li>R2 オブジェクト: ${result.removed.r2ObjectsDeleted} 件削除</li>
<li>R2 バケット: ${result.removed.r2Bucket ? "削除" : "残存の可能性あり"}</li>
</ul>`;
    if (isDry) detail = `<p><em>ドライラン — 実際には削除していません。</em></p>${detail}`;
    if (result.partialR2) {
      detail += `<div class="warn">R2 にオブジェクトが残っています。Cloudflare ダッシュボードからバケット <code>baser-edge-assets-trial</code> を空にして削除してください。</div>`;
    }
    return html("お試しサイトの削除が完了しました", `<p>管理 URL はもう使えません。復元はできません。</p>${detail}`);
  } catch (e) {
    const msg = e instanceof DestroyTrialError ? e.message : e instanceof Error ? e.message : String(e);
    logEvent("teardown.denied", { requestId, reason: "destroy_failed", accountHash, message: msg });
    return html("削除に失敗しました", `<p>${escapeHtml(msg)}</p>`, 422);
  } finally {
    await releaseAccountJob(env, accountId);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function handleFetch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/health" && req.method === "GET") {
    const disabled = opsDisabled(env);
    return Response.json({
      ok: !disabled && oauthConfigured(env),
      service: "baser-edge-cloud-operations",
      disabled,
      dryRun: dryRun(env),
    });
  }

  if ((url.pathname === "/" || url.pathname === "/teardown") && req.method === "GET") {
    return landingPage(env);
  }

  if (url.pathname === "/v1/teardown/oauth/start" && req.method === "POST") {
    return handleOAuthStart(req, env);
  }

  if (url.pathname === "/v1/teardown/oauth/callback" && req.method === "GET") {
    return handleOAuthCallback(req, env, url);
  }

  return html("Not found", `<p>ページが見つかりません。</p>`, 404);
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handleFetch(req, env);
  },
};
