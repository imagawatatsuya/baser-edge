import {
  asPrincipalId,
  asWebAuthnChallengeId,
  DomainError,
  type PrincipalId,
} from "@baser-edge/core-types";
import {
  AuthService,
  assertCloudflareAccessBoundary,
  actorFromDevHeaders,
  CSRF_HEADER,
  StepUpOperations,
  type StepUpOperation,
} from "@baser-edge/auth-kernel";
import type { CmsService } from "@baser-edge/content-kernel";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";

export interface AuthEnv {
  BASER_ENV?: string;
  BASER_ALLOW_BOOTSTRAP?: string;
  BASER_BOOTSTRAP_SECRET?: string;
  BASER_AUTH_RP_ID?: string;
  BASER_AUTH_ORIGIN?: string;
  CF_ACCESS_REQUIRED?: string;
  BASER_INSTANT_LOGIN?: string;
  BASER_INSTANT_OWNER_HINT?: string;
}

export type InstantOwnerHint = {
  workspaceId: string;
  ownerPrincipalId: string;
  siteId: string;
  siteName?: string;
  publicUrl?: string;
};

export function parseInstantOwnerHint(raw: string | undefined): InstantOwnerHint | null {
  if (!raw?.trim()) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value.workspaceId === "string"
      && typeof value.ownerPrincipalId === "string"
      && typeof value.siteId === "string"
    ) {
      return {
        workspaceId: value.workspaceId,
        ownerPrincipalId: value.ownerPrincipalId,
        siteId: value.siteId,
        ...(typeof value.siteName === "string" ? { siteName: value.siteName } : {}),
        ...(typeof value.publicUrl === "string" ? { publicUrl: value.publicUrl } : {}),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function instantLoginEnabled(env: AuthEnv): boolean {
  return !isProductionEnv(env) && env.BASER_INSTANT_LOGIN === "true" && Boolean(parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT));
}

export function createPrincipalLookup(cms: CmsService) {
  return {
    getPrincipal: async (principalId: PrincipalId) => {
      const principal = await cms.store.getPrincipal(principalId);
      if (!principal) return null;
      return {
        id: principal.id,
        workspaceId: principal.workspaceId,
        type: principal.type,
        state: principal.state,
      };
    },
  };
}

export function isProductionEnv(env: AuthEnv): boolean {
  return env.BASER_ENV === "production";
}

export async function resolveActorContext(request: Request, env: AuthEnv, auth: AuthService): Promise<import("@baser-edge/core-types").ActorContext> {
  assertCloudflareAccessBoundary(request, {
    required: env.CF_ACCESS_REQUIRED === "true",
    ...(env.BASER_AUTH_RP_ID ? { teamDomain: env.BASER_AUTH_RP_ID } : {}),
  });
  const hasDevHeaders = Boolean(request.headers.get("x-baser-principal-id"));
  if (isProductionEnv(env) && hasDevHeaders) {
    throw new DomainError("DEV_AUTH_FORBIDDEN", "Development principal headers are not allowed in production", 403);
  }
  if (!isProductionEnv(env) && hasDevHeaders) {
    return actorFromDevHeaders(request);
  }
  const session = await auth.resolveSessionFromRequest(request);
  if (session) {
    const actor = auth.actorFromSession(session, request);
    await auth.assertCsrf(request, session);
    return actor;
  }
  throw new DomainError("AUTHENTICATION_REQUIRED", "A valid session or development principal headers are required", 401);
}

export async function handleAuthRoute(
  request: Request,
  url: URL,
  env: AuthEnv,
  auth: AuthService,
  readJson: (request: Request) => Promise<Record<string, unknown>>,
): Promise<Response | null> {
  if (request.method === "GET" && url.pathname === "/v1/auth/instant-entry") {
    if (!instantLoginEnabled(env)) return json({ available: false });
    const hint = parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT)!;
    return json({
      available: true,
      siteName: hint.siteName ?? "マイサイト",
      siteId: hint.siteId,
    });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/instant-login") {
    if (!instantLoginEnabled(env)) {
      throw new DomainError("INSTANT_LOGIN_DISABLED", "Instant login is not available", 404);
    }
    const hint = parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT)!;
    const issue = await auth.issueInstantOwnerSession({
      workspaceId: hint.workspaceId as never,
      principalId: asPrincipalId(hint.ownerPrincipalId),
      userAgent: request.headers.get("user-agent"),
      ipHint: request.headers.get("cf-connecting-ip"),
    });
    return json(
      {
        workspaceId: hint.workspaceId,
        siteId: hint.siteId,
        ownerPrincipalId: hint.ownerPrincipalId,
        siteName: hint.siteName ?? "マイサイト",
        publicUrl: hint.publicUrl ?? "",
        instantDemo: true,
      },
      201,
      auth.sessionCookieHeaders(issue),
    );
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/passkeys/register/begin") {
    const body = await readJson(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.beginPasskeyRegistration(actor, {
      workspaceId: body.workspaceId as never,
      principalId: asPrincipalId(String(body.principalId)),
      label: String(body.label),
      ...(typeof body.bootstrapSecret === "string" ? { bootstrapSecret: body.bootstrapSecret } : {}),
    });
    return json({ challengeId: result.challengeId, options: result.options });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/passkeys/register/finish") {
    const body = await readJson(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.finishPasskeyRegistration(actor, {
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response as RegistrationResponseJSON,
      transports: Array.isArray(body.transports) ? body.transports.map(String) : [],
    });
    return json(result, 201);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/login/begin") {
    const body = await readJson(request);
    const result = await auth.beginLogin({
      workspaceId: body.workspaceId as never,
      principalId: asPrincipalId(String(body.principalId)),
      label: String(body.label),
    });
    return json(result);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/login/finish") {
    const body = await readJson(request);
    const issue = await auth.finishLogin({
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response as AuthenticationResponseJSON,
      userAgent: request.headers.get("user-agent"),
      ipHint: request.headers.get("cf-connecting-ip"),
    });
    return json({ principalId: issue.session.principalId, expiresAt: issue.session.expiresAt }, 201, auth.sessionCookieHeaders(issue));
  }
  if (request.method === "GET" && url.pathname === "/v1/auth/session") {
    const actor = await resolveActorContext(request, env, auth);
    return json(await auth.getSessionView(actor));
  }
  if (request.method === "GET" && url.pathname === "/v1/auth/sessions") {
    const actor = await resolveActorContext(request, env, auth);
    return json(await auth.listSessions(actor));
  }
  if (request.method === "DELETE" && url.pathname === "/v1/auth/sessions") {
    const actor = await resolveActorContext(request, env, auth);
    await auth.revokeAllSessions(actor);
    return clearCookieResponse(auth.clearSessionCookieHeaders());
  }
  const sessionMatch = url.pathname.match(/^\/v1\/auth\/sessions\/([^/]+)$/);
  if (request.method === "DELETE" && sessionMatch?.[1]) {
    const actor = await resolveActorContext(request, env, auth);
    await auth.revokeSession(actor, sessionMatch[1] as never);
    return new Response(null, { status: 204 });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
    const actor = await resolveActorContext(request, env, auth);
    await auth.logout(actor);
    return clearCookieResponse(auth.clearSessionCookieHeaders());
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/step-up/begin") {
    const body = await readJson(request);
    const actor = await resolveActorContext(request, env, auth);
    const operation = String(body.operation) as StepUpOperation;
    const result = await auth.beginStepUp(actor, operation);
    return json(result);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/step-up/finish") {
    const body = await readJson(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.finishStepUp(actor, {
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response as AuthenticationResponseJSON,
    });
    return json(result);
  }
  return null;
}

export { StepUpOperations };

function clearCookieResponse(cookies: string[]): Response {
  const headers = new Headers();
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 204, headers });
}

function json(value: unknown, status = 200, setCookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(value), { status, headers });
}
