import type { CmsService } from "@baser-edge/content-kernel";
import type { AuthService } from "@baser-edge/auth-kernel";
import {
  assertVerifiedAccessIdentity,
  buildCfOAuthAuthorizationUrl,
  cloudflareAccessLoginConfigured,
  createCfOAuthPkce,
  encodeCfOAuthRelayState,
  exchangeCfOAuthCode,
  fetchCloudflareUserEmail,
  isExternalOAuthRedirectUri,
  listCloudflareAccountIds,
  resolveCfOAuthChallengeState,
  verifyCloudflareAccessJwt,
} from "@baser-edge/auth-kernel";
import { normalizeCloudflareAccountId, normalizeCloudflareOwnerEmail } from "@baser-edge/baser-domain";
import { DomainError, asPrincipalId, type WorkspaceId } from "@baser-edge/core-types";

export interface CloudflareAuthEnv {
  BASER_CF_OAUTH_CLIENT_ID?: string;
  BASER_CF_OAUTH_CLIENT_SECRET?: string;
  BASER_CF_OAUTH_REDIRECT_URI?: string;
  PUBLIC_BASE_URL?: string;
  PREVIEW_BASE_URL?: string;
  CF_ACCESS_REQUIRED?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUDIENCE?: string;
}

export interface CfOAuthChallengeStore {
  create(state: string, codeVerifier: string, expiresAt: number, createdAt?: number): Promise<void>;
  take(state: string, now: number): Promise<string | null>;
}

export type VerifyCloudflareAccessJwtFn = (token: string) => Promise<{ email: string }>;

export interface CloudflareAuthRouteDeps {
  verifyAccessJwt?: VerifyCloudflareAccessJwtFn;
}

export function cloudflareOAuthConfigured(env: CloudflareAuthEnv): boolean {
  return Boolean(env.BASER_CF_OAUTH_CLIENT_ID?.trim() && env.BASER_CF_OAUTH_CLIENT_SECRET?.trim());
}

export function resolveCloudflareLoginMode(env: CloudflareAuthEnv): "oauth" | "access" | false {
  if (cloudflareOAuthConfigured(env)) return "oauth";
  if (cloudflareAccessLoginConfigured(env)) return "access";
  return false;
}

export function cloudflareOAuthRedirectUri(env: CloudflareAuthEnv, requestUrl: URL): string {
  const configured = env.BASER_CF_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const base = (env.PUBLIC_BASE_URL ?? requestUrl.origin).replace(/\/$/, "");
  return `${base}/v1/auth/cloudflare/callback`;
}

function createDefaultAccessJwtVerifier(env: CloudflareAuthEnv): VerifyCloudflareAccessJwtFn | null {
  if (!cloudflareAccessLoginConfigured(env)) return null;
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN!.trim();
  const audience = env.CF_ACCESS_AUDIENCE!.trim();
  return (token) => verifyCloudflareAccessJwt(token, { teamDomain, audience });
}

export async function handleCloudflareAuthRoute(
  request: Request,
  url: URL,
  env: CloudflareAuthEnv,
  cms: CmsService,
  auth: AuthService,
  challenges: CfOAuthChallengeStore,
  now = Date.now(),
  deps: CloudflareAuthRouteDeps = {},
): Promise<Response | null> {
  const loginMode = resolveCloudflareLoginMode(env);

  if (request.method === "GET" && url.pathname === "/v1/auth/access/entry") {
    if (!(await cms.hasCloudflareOwnerBinding())) {
      return json({ available: false, reason: "owner_not_bound" });
    }
    if (loginMode !== "access") {
      return json({ available: false, reason: "access_not_configured" });
    }
    return json({ available: true, mode: "access", label: "Cloudflare" });
  }

  if (request.method === "GET" && url.pathname === "/v1/auth/access/login") {
    if (!(await cms.hasCloudflareOwnerBinding())) {
      throw new DomainError("CLOUDFLARE_OWNER_NOT_BOUND", "Cloudflare owner is not bound to this site", 503);
    }
    const verify = deps.verifyAccessJwt ?? createDefaultAccessJwtVerifier(env);
    if (!verify) {
      throw new DomainError("ACCESS_LOGIN_DISABLED", "Cloudflare Access login is not configured", 403);
    }
    let rawEmail: string;
    try {
      rawEmail = await assertVerifiedAccessIdentity(request, env, verify);
    } catch (error) {
      if (error instanceof DomainError && error.code === "ACCESS_JWT_REQUIRED") {
        return redirectToLogin(
          url,
          "Cloudflare Access でこのサイトを開いてからログインしてください（Zero Trust → Access → アプリケーション）。",
        );
      }
      throw error;
    }
    const email = normalizeCloudflareOwnerEmail(rawEmail);
    const target = await cms.findCloudflareLoginTargetByEmail(email);
    if (!target) {
      throw new DomainError("CLOUDFLARE_LOGIN_NOT_AUTHORIZED", "This Cloudflare account is not authorized for CMS login", 403);
    }
    return issueCloudflareOwnerCmsSession(auth, request, url, env, target);
  }

  if (request.method === "GET" && url.pathname === "/v1/auth/cloudflare/entry") {
    if (!(await cms.hasCloudflareOwnerBinding())) {
      return json({ available: false, reason: "owner_not_bound" });
    }
    if (loginMode === false) {
      return json({ available: false, reason: "login_not_configured" });
    }
    return json({ available: true, mode: loginMode, label: "Cloudflare" });
  }

  if (request.method === "GET" && url.pathname === "/v1/auth/cloudflare/login") {
    if (!(await cms.hasCloudflareOwnerBinding())) {
      throw new DomainError("CLOUDFLARE_OWNER_NOT_BOUND", "Cloudflare owner is not bound to this site", 503);
    }
    if (!cloudflareOAuthConfigured(env)) {
      if (cloudflareAccessLoginConfigured(env)) {
        return Response.redirect(`${url.origin}/v1/auth/access/login`, 302);
      }
      return redirectToLogin(
        url,
        "Cloudflare ログインが未設定です（OAuth シークレットまたは CF_ACCESS_* を設定してください）。",
      );
    }
    const pkce = await createCfOAuthPkce();
    const redirectUri = cloudflareOAuthRedirectUri(env, url);
    const oauthState = isExternalOAuthRedirectUri(redirectUri, url.origin)
      ? encodeCfOAuthRelayState(url.origin, pkce.state)
      : pkce.state;
    await challenges.create(pkce.state, pkce.codeVerifier, now + 10 * 60_000, now);
    const location = buildCfOAuthAuthorizationUrl({
      clientId: env.BASER_CF_OAUTH_CLIENT_ID!.trim(),
      redirectUri,
      state: oauthState,
      codeChallenge: pkce.codeChallenge,
    });
    return Response.redirect(location, 302);
  }

  if (request.method === "GET" && url.pathname === "/v1/auth/cloudflare/callback") {
    if (!cloudflareOAuthConfigured(env)) {
      throw new DomainError("CLOUDFLARE_OAUTH_DISABLED", "Cloudflare OAuth is not configured", 503);
    }
    const err = url.searchParams.get("error");
    if (err) {
      return redirectToLogin(url, `Cloudflare OAuth error: ${url.searchParams.get("error_description") ?? err}`);
    }
    const code = url.searchParams.get("code");
    const rawState = url.searchParams.get("state");
    if (!code || !rawState) {
      return redirectToLogin(url, "Cloudflare OAuth callback is incomplete");
    }
    const { challengeKey, expectedSiteOrigin } = resolveCfOAuthChallengeState(rawState);
    if (expectedSiteOrigin && expectedSiteOrigin !== url.origin) {
      return redirectToLogin(url, "OAuth callback site mismatch");
    }
    const codeVerifier = await challenges.take(challengeKey, now);
    if (!codeVerifier) {
      return redirectToLogin(url, "OAuth session expired. Try again.");
    }
    const redirectUri = cloudflareOAuthRedirectUri(env, url);
    const accessToken = await exchangeCfOAuthCode({
      code,
      codeVerifier,
      redirectUri,
      clientId: env.BASER_CF_OAUTH_CLIENT_ID!.trim(),
      clientSecret: env.BASER_CF_OAUTH_CLIENT_SECRET!.trim(),
    });
    const target = await resolveCloudflareLoginTarget(cms, accessToken);
    return issueCloudflareOwnerCmsSession(auth, request, url, env, target);
  }

  return null;
}

async function issueCloudflareOwnerCmsSession(
  auth: AuthService,
  request: Request,
  url: URL,
  env: CloudflareAuthEnv,
  target: { workspaceId: string; ownerPrincipalId: string; siteId: string; siteName: string },
): Promise<Response> {
  const issue = await auth.issueCloudflareIdentitySession({
    workspaceId: target.workspaceId as WorkspaceId,
    principalId: asPrincipalId(target.ownerPrincipalId),
    userAgent: request.headers.get("user-agent"),
    ipHint: request.headers.get("cf-connecting-ip"),
  });
  const login = new URL(`${url.origin}/console/login`);
  login.searchParams.set("oauth", "complete");
  login.searchParams.set("workspaceId", target.workspaceId);
  login.searchParams.set("siteId", target.siteId);
  login.searchParams.set("ownerPrincipalId", target.ownerPrincipalId);
  login.searchParams.set("siteName", target.siteName);
  const publicUrl = env.PREVIEW_BASE_URL?.trim();
  if (publicUrl) login.searchParams.set("publicUrl", publicUrl.replace(/\/$/, ""));
  const headers = new Headers({ location: login.toString() });
  for (const cookie of auth.sessionCookieHeaders(issue)) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function resolveCloudflareLoginTarget(cms: CmsService, accessToken: string, fetchImpl?: typeof fetch) {
  const email = normalizeCloudflareOwnerEmail(await fetchCloudflareUserEmail(accessToken, fetchImpl));
  const accountIds = await listCloudflareAccountIds(accessToken, fetchImpl);
  for (const rawAccountId of accountIds) {
    const accountId = normalizeCloudflareAccountId(rawAccountId);
    const target = await cms.findCloudflareLoginTarget(accountId, email);
    if (target) return target;
  }
  // CMS OAuth uses narrow scopes; GET /accounts can omit the bound account even when
  // GET /user email matches the workspace owner (common on trial workers.dev sites).
  try {
    const byEmail = await cms.findCloudflareLoginTargetByEmail(email);
    if (byEmail) return byEmail;
  } catch (error) {
    if (!(error instanceof DomainError && error.code === "CLOUDFLARE_OWNER_AMBIGUOUS")) throw error;
  }
  throw new DomainError(
    "CLOUDFLARE_LOGIN_NOT_AUTHORIZED",
    "This Cloudflare account is not authorized for CMS login",
    403,
  );
}

function redirectToLogin(url: URL, message: string): Response {
  const login = new URL(`${url.origin}/console/login`);
  login.searchParams.set("error", message);
  return Response.redirect(login.toString(), 302);
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

