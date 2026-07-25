import { buildTestAuthenticationResponse } from "./test-webauthn-client.js";

export const CSRF_HEADER = "x-baser-csrf-token";
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("baser-edge-session") ?? "null");
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem("baser-edge-session", JSON.stringify(session));
}

export function readCsrfToken() {
  const stored = localStorage.getItem("baser_csrf");
  if (stored) return stored;
  const match = document.cookie.match(/(?:^|;\s*)baser_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function persistCsrfFromResponse(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  for (const entry of setCookies) {
    const match = String(entry).match(/baser_csrf=([^;]+)/);
    if (match) localStorage.setItem("baser_csrf", decodeURIComponent(match[1]));
  }
}

export async function apiFetch(session, path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("content-type") && options.body) headers.set("content-type", "application/json");
  const method = options.method ?? (options.body ? "POST" : "GET");
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCsrfToken();
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }
  const response = await fetch(`${session.apiUrl}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${response.status})`);
  }
  return json;
}

export async function ensureStepUp(session, operation) {
  const begin = await apiFetch(session, "/v1/auth/step-up/begin", { method: "POST", body: { operation } });
  await apiFetch(session, "/v1/auth/step-up/finish", {
    method: "POST",
    body: {
      challengeId: begin.challengeId,
      response: buildTestAuthenticationResponse(begin.options.challenge, session.credentialId),
    },
  });
}

export async function approveAndPublish(session, snapshot) {
  await ensureStepUp(session, "content.publish");
  const revisionId = snapshot.workingRevision?.id;
  if (!revisionId) throw new Error("公開するRevisionがありません");
  const approval = await apiFetch(session, `/v1/content/${encodeURIComponent(snapshot.item.id)}/approvals`, {
    method: "POST",
    body: { revisionId, riskLevel: "medium" },
  });
  await apiFetch(session, `/v1/approvals/${encodeURIComponent(approval.id)}/decide`, {
    method: "POST",
    body: { decision: "approved", comment: "管理画面から承認" },
  });
  return apiFetch(session, `/v1/content/${encodeURIComponent(snapshot.item.id)}/publish`, {
    method: "POST",
    body: { revisionId, approvalId: approval.id },
  });
}

export async function loginWithPasskey(hint) {
  const session = {
    apiUrl: hint.apiUrl,
    publicUrl: hint.publicUrl,
    workspaceId: hint.workspaceId,
    siteId: hint.siteId,
    ownerPrincipalId: hint.ownerPrincipalId,
    passkeyLabel: hint.passkeyLabel,
    credentialId: hint.credentialId,
  };
  const begin = await fetch(`${session.apiUrl}/v1/auth/login/begin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      workspaceId: session.workspaceId,
      principalId: session.ownerPrincipalId,
      label: session.passkeyLabel,
    }),
  });
  const beginBody = await begin.json();
  if (!begin.ok) throw new Error(beginBody.error?.message ?? "ログイン開始に失敗しました");
  const finish = await fetch(`${session.apiUrl}/v1/auth/login/finish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      challengeId: beginBody.challengeId,
      response: buildTestAuthenticationResponse(beginBody.options.challenge, session.credentialId),
    }),
  });
  const finishBody = await finish.json();
  if (!finish.ok) throw new Error(finishBody.error?.message ?? "ログインに失敗しました");
  persistCsrfFromResponse(finish);
  saveSession(session);
  return session;
}
