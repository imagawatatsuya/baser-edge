import helpJson from "../../../scripts/onboarding/help.json";
import { resolveBaserCfOAuthScopes, validateOAuthScopeShape } from "./cf-oauth-scopes";

export interface Env {
  ASSETS: Fetcher;
  ONBOARDING_KV: KVNamespace;
  BASER_CF_OAUTH_CLIENT_ID: string;
  BASER_CF_OAUTH_CLIENT_SECRET: string;
  BASER_CF_OAUTH_SCOPES?: string;
  BASER_ONBOARDING_PUBLIC?: string;
  GITHUB_REPO: string;
  GH_DISPATCH_TOKEN: string;
  ONBOARDING_TOKEN_ENCRYPTION_KEY: string;
  ONBOARDING_CALLBACK_SECRET: string;
  BASER_ONBOARDING_RATE_LIMIT_PER_MIN?: string;
  /** 固定 trial 開設（ob-* ではなく BASER_CF_STACK=trial）。一般向けお試しは trial を推奨。 */
  BASER_ONBOARDING_PROVISION_STACK_ID?: string;
  /** お試しをやめる（Cloud Operations Worker）の公開 URL */
  BASER_EDGE_OPS_PUBLIC_URL?: string;
}

type SessionRecord = {
  id: string;
  status: string;
  step: string;
  message: string;
  stackId: string;
  accountName: string | null;
  consoleUrl: string | null;
  publicUrl: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const CF_API = "https://api.cloudflare.com/client/v4";
const GRANT_TTL = 15 * 60;
const SESSION_TTL = 24 * 60 * 60;

function publicTrial(env: Env): boolean {
  const v = env.BASER_ONBOARDING_PUBLIC?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

function oauthConfigured(env: Env): boolean {
  return Boolean(env.BASER_CF_OAUTH_CLIENT_ID?.trim() && env.BASER_CF_OAUTH_CLIENT_SECRET?.trim());
}

function oauthScopes(env: Env): string {
  return resolveBaserCfOAuthScopes(env.BASER_CF_OAUTH_SCOPES);
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(), ...extra },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-onboarding-secret",
  };
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, ...corsHeaders() } });
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

async function rateLimited(req: Request, env: Env, route: string): Promise<Response | null> {
  const limit = Number(env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN ?? 30);
  const key = `rl:${clientIp(req)}:${route}`;
  const raw = await env.ONBOARDING_KV.get(key);
  const now = Date.now();
  let count = 0;
  let resetAt = now + 60_000;
  if (raw) {
    const parsed = JSON.parse(raw) as { count: number; resetAt: number };
    if (parsed.resetAt > now) {
      count = parsed.count;
      resetAt = parsed.resetAt;
    }
  }
  count += 1;
  await env.ONBOARDING_KV.put(key, JSON.stringify({ count, resetAt }), { expirationTtl: 120 });
  if (count > limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return json(
      { error: { message: "リクエストが多すぎます。しばらくしてから再度お試しください。" } },
      429,
      { "retry-after": String(retryAfter) },
    );
  }
  return null;
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

async function encryptToken(env: Env, plaintext: string): Promise<string> {
  const keyRaw = Uint8Array.from(atob(env.ONBOARDING_TOKEN_ENCRYPTION_KEY.trim()), (c) => c.charCodeAt(0));
  if (keyRaw.length !== 32) throw new Error("ONBOARDING_TOKEN_ENCRYPTION_KEY invalid");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["encrypt"]);
  const enc = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc);
  const cipherBytes = new Uint8Array(cipher);
  const tag = cipherBytes.slice(-16);
  const data = cipherBytes.slice(0, -16);
  const packed = new Uint8Array(12 + 16 + data.length);
  packed.set(iv, 0);
  packed.set(tag, 12);
  packed.set(data, 28);
  return base64url(packed);
}

async function takeGrant(env: Env, id: string): Promise<string | null> {
  const token = await env.ONBOARDING_KV.get(`grant:${id}`);
  if (token) await env.ONBOARDING_KV.delete(`grant:${id}`);
  return token;
}

async function issueGrant(env: Env, accessToken: string): Promise<string> {
  const id = randomHex(16);
  await env.ONBOARDING_KV.put(`grant:${id}`, accessToken, { expirationTtl: GRANT_TTL });
  return id;
}

async function saveSession(env: Env, session: SessionRecord): Promise<void> {
  session.updatedAt = Date.now();
  await env.ONBOARDING_KV.put(`session:${session.id}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
}

async function loadSession(env: Env, id: string): Promise<SessionRecord | null> {
  const raw = await env.ONBOARDING_KV.get(`session:${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as SessionRecord;
}

async function listAccounts(token: string): Promise<{ name: string }[]> {
  const res = await fetch(`${CF_API}/accounts`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as { success?: boolean; result?: { name: string }[]; errors?: { message?: string }[] };
  if (!body.success) throw new Error(body.errors?.[0]?.message ?? "アカウント一覧の取得に失敗しました");
  const accounts = body.result ?? [];
  if (!accounts.length) throw new Error("このトークンで利用できる Cloudflare アカウントがありません");
  return accounts;
}

async function dispatchGithub(env: Env, eventType: string, clientPayload: Record<string, string>): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "baser-edge-onboarding-worker",
    },
    body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed: ${res.status} ${text}`);
  }
}

function newStackId(): string {
  return `ob-${randomHex(12)}`;
}

function provisionStackId(env: Env): string {
  const fixed = env.BASER_ONBOARDING_PROVISION_STACK_ID?.trim().toLowerCase();
  if (!fixed) return newStackId();
  if (fixed === "trial") return "trial";
  throw new Error(`BASER_ONBOARDING_PROVISION_STACK_ID "${fixed}" is not allowed`);
}

async function resolveApiToken(
  env: Env,
  body: { oauthGrantId?: string; cloudflareApiToken?: string },
): Promise<string> {
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

async function startProveJob(env: Env, req: Request, apiToken: string): Promise<Response> {
  if (!env.GITHUB_REPO?.trim() || !env.GH_DISPATCH_TOKEN?.trim()) {
    throw new Error("お試しの開設ジョブが未設定です（ホスト運用の GitHub 連携）");
  }
  const accounts = await listAccounts(apiToken);
  const stackId = provisionStackId(env);
  const sessionId = randomHex(12);
  const session: SessionRecord = {
    id: sessionId,
    status: "queued",
    step: "queued",
    message: "開設を準備しています…",
    stackId,
    accountName: accounts[0]?.name ?? null,
    consoleUrl: null,
    publicUrl: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveSession(env, session);

  const ciphertext = await encryptToken(env, apiToken);
  const origin = requestOrigin(req);
  await dispatchGithub(env, "onboarding-prove", {
    sessionId,
    stackId,
    ciphertext,
    callbackUrl: `${origin}/api/onboarding/internal/progress`,
  });

  await saveSession(env, { ...session, status: "running", step: "connect", message: "Cloudflare に接続しました" });

  return json(
    {
      sessionId,
      stackId,
      accountName: session.accountName,
      status: "running",
    },
    201,
  );
}

function oauthClientIdSuffix(env: Env): string | undefined {
  const id = env.BASER_CF_OAUTH_CLIENT_ID?.trim();
  if (!id || id.length < 8) return undefined;
  return id.slice(-4);
}

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

  const oauthOn = oauthConfigured(env);
  const ready = !publicTrial(env) || oauthOn;

  if (url.pathname === "/api/onboarding/health") {
    const scopes = oauthOn ? oauthScopes(env) : undefined;
    const oauthScopeConfigError = scopes ? validateOAuthScopeShape(scopes) : null;
    return json(
      {
        ok: ready && !oauthScopeConfigError,
        service: "baser-edge-onboarding",
        oauthEnabled: oauthOn,
        publicTrial: publicTrial(env),
        ready: ready && !oauthScopeConfigError,
        host: "cloudflare-worker",
        oauthClientIdSuffix: oauthOn ? oauthClientIdSuffix(env) : undefined,
        oauthScopes: scopes,
        oauthScopeConfigError: oauthScopeConfigError ?? undefined,
      },
      ready && !oauthScopeConfigError ? 200 : 503,
    );
  }

  if (url.pathname === "/api/onboarding/help") {
    const provisionFixed = env.BASER_ONBOARDING_PROVISION_STACK_ID?.trim().toLowerCase() || null;
    const teardownUrl = env.BASER_EDGE_OPS_PUBLIC_URL?.trim() || undefined;
    const help = {
      ...helpJson,
      oauthEnabled: oauthOn,
      publicTrial: publicTrial(env),
      ready,
      provisionStackId: provisionFixed === "trial" ? "trial" : undefined,
      teardownUrl,
    };
    return json(help);
  }

  if (!ready) {
    return json(
      { error: { message: "お試しの開設サービスは現在ご利用いただけません。しばらくしてから再度お試しください。" } },
      503,
    );
  }

  if (url.pathname === "/api/onboarding/internal/progress" && req.method === "POST") {
    if (req.headers.get("x-onboarding-secret") !== env.ONBOARDING_CALLBACK_SECRET) {
      return json({ error: { message: "Forbidden" } }, 403);
    }
    const body = (await req.json()) as Partial<SessionRecord> & { sessionId?: string };
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
      error: body.error ?? session.error,
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
      code_challenge_method: "S256",
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
      const pending = JSON.parse(pendingRaw) as { verifier: string; intent: string };
      const redirectUri = `${requestOrigin(req)}/api/onboarding/oauth/callback`;
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env.BASER_CF_OAUTH_CLIENT_ID.trim(),
        client_secret: env.BASER_CF_OAUTH_CLIENT_SECRET.trim(),
        code_verifier: pending.verifier,
      });
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };
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
      const body = (await req.json()) as { oauthGrantId?: string; cloudflareApiToken?: string };
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
      const body = (await req.json()) as {
        oauthGrantId?: string;
        cloudflareApiToken?: string;
        stackId?: string;
      };
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
    const session = await loadSession(env, sessionMatch[1]);
    if (!session) return json({ error: { message: "セッションが見つかりません" } }, 404);
    return json({
      id: session.id,
      status: session.status,
      step: session.step,
      message: session.message,
      consoleUrl: session.consoleUrl ?? undefined,
      publicUrl: session.publicUrl ?? undefined,
      accountName: session.accountName ?? undefined,
      stackId: session.stackId,
      error: session.error ?? undefined,
    });
  }

  return json({ error: { message: "Not found" } }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}/start/`, 302);
    }
    if (url.pathname.startsWith("/api/onboarding")) {
      return handleApi(req, env, url);
    }
    return env.ASSETS.fetch(req);
  },
};
