import type { ApiError, ContentSnapshot, LocalLoginHint, SessionState } from "./types";
import { buildTestAuthenticationResponse } from "./webauthn";
import { cacheDevPublicUrl, devStackConsoleUrl } from "../lib/localDevUrls";

const CSRF_HEADER = "x-baser-csrf-token";
const SESSION_KEY = "baser-admin-session";
const CSRF_KEY = "baser_csrf";
export const AUTH_EXPIRED_EVENT = "baser-auth-expired";

export function getSession(): SessionState | null {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) ??
      localStorage.getItem("baser-edge-session") ??
      localStorage.getItem("baser-cloud-session");
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionState;
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, raw);
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("baser-edge-session");
  localStorage.removeItem("baser-cloud-session");
  localStorage.removeItem(CSRF_KEY);
}

const AUTH_REQUIRED_HINT =
  `ログインが必要です。${devStackConsoleUrl()} で npm run dev:stack を起動し、Passkey でログインしてください（スタック再起動後は毎回再ログイン）。`;

function authRequiredMessage(apiMessage?: string): string {
  if (apiMessage?.includes("valid session") || apiMessage?.includes("development principal")) {
    return AUTH_REQUIRED_HINT;
  }
  return apiMessage ?? AUTH_REQUIRED_HINT;
}

function failAuth() {
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export function syncCsrfFromCookies(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)baser_csrf=([^;]+)/);
  if (match) {
    const value = decodeURIComponent(match[1]);
    localStorage.setItem(CSRF_KEY, value);
    return value;
  }
  return localStorage.getItem(CSRF_KEY);
}

function readCsrf(): string | null {
  return syncCsrfFromCookies();
}

export function hasAuthenticatedSession(): boolean {
  return Boolean(getSession() && readCsrf());
}

export async function apiFetch<T>(path: string, options: RequestInit & { json?: unknown } = {}, csrfRetried = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
  }
  const method = options.method ?? (options.json !== undefined ? "POST" : "GET");
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCsrf();
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: "include",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  const text = await response.text();
  let data: T & ApiError = {} as T & ApiError;
  if (text) {
    try { data = JSON.parse(text) as T & ApiError; } catch { throw new Error(text || `HTTP ${response.status}`); }
  }
  if (!response.ok) {
    const msg = data.error?.message ?? `HTTP ${response.status}`;
    const code = data.error?.code;
    if (code === "CSRF_VALIDATION_FAILED" || msg.includes("CSRF token")) {
      if (!csrfRetried) {
        localStorage.removeItem(CSRF_KEY);
        syncCsrfFromCookies();
        if (readCsrf()) return apiFetch<T>(path, options, true);
      }
      failAuth();
      throw new Error("セッションの認証情報が不足しています。Passkey でログインし直してください。");
    }
    if (response.status === 401 || code === "AUTHENTICATION_REQUIRED") {
      failAuth();
      throw new Error(authRequiredMessage(msg));
    }
    if (data.error?.code === "LOCAL_STACK_REQUIRED") {
      throw new Error(msg);
    }
    if (response.status === 404 && msg === "Route not found") {
      throw new Error(`APIルートが見つかりません。npm run dev:stack で起動し、${devStackConsoleUrl()} を開いてください（dev:api のみでは不足です）。`);
    }
    throw new Error(code ? `${code}: ${msg}` : msg);
  }
  return data as T;
}

export async function verifySession(): Promise<boolean> {
  try {
    await apiFetch("/v1/auth/session");
    return true;
  } catch {
    return false;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await apiFetch("/v1/auth/logout", { method: "POST", json: {} });
  } catch {
    // ignore — local session is cleared regardless
  } finally {
    failAuth();
  }
}

export async function fetchCloudflareEntry(): Promise<{ available: boolean; label?: string; mode?: "oauth" | "access" }> {
  return apiFetch("/v1/auth/cloudflare/entry");
}

export function startCloudflareLogin(mode: "oauth" | "access" = "oauth"): void {
  const path = mode === "access" ? "/v1/auth/access/login" : "/v1/auth/cloudflare/login";
  window.location.assign(path);
}

/** After OAuth callback sets cookies, hydrate localStorage before entering /console/content. */
export async function completeCloudflareOAuthLogin(searchParams: URLSearchParams): Promise<SessionState> {
  if (searchParams.get("oauth") !== "complete") {
    throw new Error("OAuth 完了パラメータがありません");
  }
  const workspaceId = searchParams.get("workspaceId")?.trim();
  const siteId = searchParams.get("siteId")?.trim();
  const ownerPrincipalId = searchParams.get("ownerPrincipalId")?.trim();
  if (!workspaceId || !siteId || !ownerPrincipalId) {
    throw new Error("ログイン情報が不完全です。もう一度 Cloudflare でログインしてください。");
  }
  syncCsrfFromCookies();
  if (!readCsrf()) {
    throw new Error("ログイン Cookie を取得できませんでした。もう一度お試しください。");
  }
  const session: SessionState = {
    apiUrl: window.location.origin,
    publicUrl: searchParams.get("publicUrl")?.trim() || "",
    workspaceId,
    siteId,
    ownerPrincipalId,
    siteName: searchParams.get("siteName")?.trim() || "マイサイト",
  };
  saveSession(session);
  const ok = await verifySession();
  if (!ok) throw new Error("セッションを確認できませんでした。もう一度ログインしてください。");
  if (session.publicUrl) cacheDevPublicUrl(session.publicUrl);
  return session;
}

export async function fetchInstantEntry(): Promise<{ available: boolean; siteName?: string; siteId?: string; publicUrl?: string }> {
  return apiFetch("/v1/auth/instant-entry");
}

export async function loginInstant(): Promise<SessionState> {
  localStorage.removeItem(CSRF_KEY);
  const body = await fetch("/v1/auth/instant-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: "{}",
  });
  const data = await body.json() as SessionState & ApiError;
  if (!body.ok) {
    throw new Error(authRequiredMessage(data.error?.message) || "ログインに失敗しました");
  }
  syncCsrfFromCookies();
  if (!readCsrf()) throw new Error("ログイン応答の CSRF Cookie を取得できませんでした。");
  const session: SessionState = {
    apiUrl: window.location.origin,
    publicUrl: data.publicUrl || "",
    workspaceId: data.workspaceId,
    siteId: data.siteId,
    ownerPrincipalId: data.ownerPrincipalId,
    siteName: data.siteName,
    instantDemo: true,
  };
  cacheDevPublicUrl(session.publicUrl);
  saveSession(session);
  const ok = await verifySession();
  if (!ok) throw new Error("セッションを確認できませんでした。");
  return session;
}

export async function fetchLoginHint(): Promise<LocalLoginHint> {
  return apiFetch<LocalLoginHint>("/v1/dev/local-login-hint");
}

export async function loginWithPasskey(hint: LocalLoginHint): Promise<SessionState> {
  if (!hint.passkeyLabel || !hint.credentialId) {
    throw new Error("Passkey 情報がありません。instant ログインを利用してください。");
  }
  localStorage.removeItem(CSRF_KEY);
  const session: SessionState = { ...hint };
  const begin = await apiFetch<{ challengeId: string; options: { challenge: string } }>("/v1/auth/login/begin", {
    method: "POST",
    json: {
      workspaceId: session.workspaceId,
      principalId: session.ownerPrincipalId,
      label: session.passkeyLabel,
    },
  });
  const finishRes = await fetch("/v1/auth/login/finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      challengeId: begin.challengeId,
      response: buildTestAuthenticationResponse(begin.options.challenge, session.credentialId),
    }),
  });
  const finishBody = await finishRes.json() as ApiError;
  if (!finishRes.ok) {
    throw new Error(authRequiredMessage(finishBody.error?.message) || "ログインに失敗しました");
  }
  syncCsrfFromCookies();
  if (!readCsrf()) {
    throw new Error(
      `ログイン応答の CSRF Cookie を取得できませんでした。${devStackConsoleUrl()} を開き、dev:api 単体ではなく npm run dev:stack を使ってください。`,
    );
  }
  cacheDevPublicUrl(session.publicUrl);
  saveSession(session);
  const ok = await verifySession();
  if (!ok) throw new Error("ログインは完了しましたがセッションを確認できませんでした。ページを再読み込みして再度ログインしてください。");
  return session;
}

export async function ensureStepUp(operation: string, credentialId: string | undefined) {
  if (!credentialId) return;
  const begin = await apiFetch<{ challengeId: string; options: { challenge: string } }>("/v1/auth/step-up/begin", {
    method: "POST",
    json: { operation },
  });
  await apiFetch("/v1/auth/step-up/finish", {
    method: "POST",
    json: {
      challengeId: begin.challengeId,
      response: buildTestAuthenticationResponse(begin.options.challenge, credentialId),
    },
  });
}

export async function publishContent(contentItemId: string, snapshot: { workingRevision?: { id: string } | null }, credentialId?: string) {
  const revisionId = snapshot.workingRevision?.id;
  if (!revisionId) throw new Error("公開する下書きがありません");
  await ensureStepUp("content.publish", credentialId);
  const approval = await apiFetch<{ id: string }>(`/v1/content/${encodeURIComponent(contentItemId)}/approvals`, {
    method: "POST",
    json: { revisionId, riskLevel: "medium" },
  });
  await apiFetch(`/v1/approvals/${encodeURIComponent(approval.id)}/decide`, {
    method: "POST",
    json: { decision: "approved", comment: "管理画面から承認" },
  });
  return apiFetch(`/v1/content/${encodeURIComponent(contentItemId)}/publish`, {
    method: "POST",
    json: { revisionId, approvalId: approval.id },
  });
}

export async function unpublishContent(contentItemId: string, credentialId?: string) {
  await ensureStepUp("content.unpublish", credentialId);
  return apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(contentItemId)}/unpublish`, {
    method: "POST",
    json: {},
  });
}

export async function unpublishCustomEntry(entryId: string, credentialId?: string) {
  await ensureStepUp("custom-entry.unpublish", credentialId);
  return apiFetch(`/v1/custom-entries/${encodeURIComponent(entryId)}/unpublish`, {
    method: "POST",
    json: {},
  });
}
