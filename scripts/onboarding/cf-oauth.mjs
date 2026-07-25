import { randomBytes, createHash } from "node:crypto";

const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";

export function oauthConfigured() {
  return Boolean(
    process.env.BASER_CF_OAUTH_CLIENT_ID?.trim() && process.env.BASER_CF_OAUTH_CLIENT_SECRET?.trim(),
  );
}

export function oauthRedirectUri(override) {
  const fixed = override?.trim() || process.env.BASER_CF_OAUTH_REDIRECT_URI?.trim();
  if (fixed) return fixed;
  return "http://localhost:5174/api/onboarding/oauth/callback";
}

/** Space-separated; must match scopes registered on the OAuth client in Cloudflare dashboard */
export function oauthScopes() {
  const raw = process.env.BASER_CF_OAUTH_SCOPES?.trim();
  if (raw) return raw;
  return "account:read workers_scripts:edit d1:edit";
}

export function createOAuthState() {
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { state, codeVerifier, codeChallenge };
}

export function buildAuthorizationUrl({ state, codeChallenge, redirectUri }) {
  const params = new URLSearchParams({
    client_id: process.env.BASER_CF_OAUTH_CLIENT_ID.trim(),
    redirect_uri: oauthRedirectUri(redirectUri),
    response_type: "code",
    scope: oauthScopes(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(code, codeVerifier, redirectUri) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: oauthRedirectUri(redirectUri),
    client_id: process.env.BASER_CF_OAUTH_CLIENT_ID.trim(),
    client_secret: process.env.BASER_CF_OAUTH_CLIENT_SECRET.trim(),
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error_description || json.error || res.statusText;
    throw new Error(`Cloudflare OAuth トークン取得に失敗しました: ${msg}`);
  }
  const accessToken = json.access_token;
  if (!accessToken) throw new Error("Cloudflare OAuth 応答に access_token がありません");
  return {
    accessToken,
    expiresIn: json.expires_in ?? null,
    refreshToken: json.refresh_token ?? null,
  };
}
