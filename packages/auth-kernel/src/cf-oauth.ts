import { base64UrlEncode } from "@baser-edge/core-types";

export const CF_OAUTH_AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
export const CF_OAUTH_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
export const CF_API_BASE = "https://api.cloudflare.com/client/v4";

/** Minimal scopes for CMS login (identity + account membership). */
export const CF_CMS_LOGIN_OAUTH_SCOPES = "user.read account.read";

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createCfOAuthPkce(): Promise<{ state: string; codeVerifier: string; codeChallenge: string }> {
  const state = randomHex(16);
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64UrlEncode(verifierBytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64UrlEncode(new Uint8Array(digest));
  return { state, codeVerifier, codeChallenge };
}

export function buildCfOAuthAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: input.scopes ?? CF_CMS_LOGIN_OAUTH_SCOPES,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${CF_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCfOAuthCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code_verifier: input.codeVerifier,
  });
  const res = await fetchImpl(CF_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `OAuth token exchange failed (${res.status})`);
  }
  if (!json.access_token) throw new Error("OAuth token response missing access_token");
  return json.access_token;
}

export async function fetchCloudflareUserEmail(accessToken: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(`${CF_API_BASE}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({})) as { success?: boolean; result?: { email?: string } };
  if (!res.ok || json.success === false || !json.result?.email) {
    throw new Error("Failed to load Cloudflare user profile");
  }
  return json.result.email;
}

export async function listCloudflareAccountIds(accessToken: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${CF_API_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({})) as { success?: boolean; result?: { id: string }[] };
  if (!res.ok || json.success === false || !Array.isArray(json.result)) {
    throw new Error("Failed to list Cloudflare accounts");
  }
  return json.result.map((row) => row.id.toLowerCase());
}
