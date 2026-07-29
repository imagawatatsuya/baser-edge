import {
  assertDomain,
  DomainError,
  newId,
  systemClock,
  type ActorContext,
  type AuthIdentityId,
  type AuthSessionId,
  type Clock,
  type PrincipalId,
  type PrincipalType,
  type RiskLevel,
  type WebAuthnChallengeId,
  type WorkspaceId,
  asAuthIdentityId,
  asAuthSessionId,
  asPasskeyCredentialId,
  asPrincipalId,
  asSessionStepUpId,
  asWebAuthnChallengeId,
} from "@baser-edge/core-types";
import type { Capability } from "@baser-edge/authorization";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import type { AuthStore } from "./store.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STEP_UP_TTL_MS,
  type AuthIdentity,
  type AuthSession,
  type PasskeyCredential,
  type SessionIssueResult,
} from "./entities.js";
import { clearCookie, hashSecret, parseCookies, randomToken, serializeCookie } from "./cookies.js";
import { assertCsrfForMutation } from "./csrf.js";
import { requiredStepUpOperation, StepUpOperations, type StepUpOperation } from "./step-up.js";
import type { WebAuthnGateway } from "./gateway.js";
import { SimpleWebAuthnGateway } from "./webauthn.js";

export interface PrincipalLookup {
  getPrincipal(principalId: PrincipalId): Promise<{ id: PrincipalId; workspaceId: WorkspaceId; type: PrincipalType; state: string } | null>;
}

export interface AuthServiceOptions {
  store: AuthStore;
  principals: PrincipalLookup;
  webauthn: WebAuthnGateway;
  clock?: Clock;
  sessionTtlMs?: number;
  sessionTouchIntervalMs?: number;
  stepUpTtlMs?: number;
  secureCookies?: boolean;
  bootstrapSecret?: string | null;
}

export const DEFAULT_SESSION_TOUCH_INTERVAL_MS = 5 * 60_000;

export class AuthService {
  readonly #store: AuthStore;
  readonly #principals: PrincipalLookup;
  readonly #webauthn: WebAuthnGateway;
  readonly #clock: Clock;
  readonly #sessionTtlMs: number;
  readonly #sessionTouchIntervalMs: number;
  readonly #stepUpTtlMs: number;
  readonly #secureCookies: boolean;
  readonly #bootstrapSecret: string | null;

  constructor(options: AuthServiceOptions) {
    this.#store = options.store;
    this.#principals = options.principals;
    this.#webauthn = options.webauthn;
    this.#clock = options.clock ?? systemClock;
    this.#sessionTtlMs = options.sessionTtlMs ?? SESSION_TTL_MS;
    this.#sessionTouchIntervalMs = options.sessionTouchIntervalMs ?? DEFAULT_SESSION_TOUCH_INTERVAL_MS;
    this.#stepUpTtlMs = options.stepUpTtlMs ?? STEP_UP_TTL_MS;
    this.#secureCookies = options.secureCookies ?? false;
    this.#bootstrapSecret = options.bootstrapSecret ?? null;
  }

  async beginPasskeyRegistration(actor: ActorContext, input: {
    workspaceId: WorkspaceId;
    principalId: PrincipalId;
    label: string;
    bootstrapSecret?: string;
  }): Promise<{ challengeId: WebAuthnChallengeId; options: unknown }> {
    await this.#assertRegistrationAuthority(actor, input);
    const principal = await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    let identity = await this.#store.getIdentityByLabel(input.workspaceId, principal.id, input.label);
    if (!identity) {
      identity = {
        id: asAuthIdentityId(newId("authIdentity")),
        workspaceId: input.workspaceId,
        principalId: principal.id,
        label: input.label,
        state: "active",
        createdAt: this.#clock.now(),
      };
      await this.#store.createIdentity(identity);
    }
    const existing = await this.#store.listPasskeysForIdentity(identity.id);
    const { options, challenge } = await this.#webauthn.registrationOptions({
      userId: identity.id,
      userName: `${input.label}@${input.workspaceId}`,
      userDisplayName: input.label,
      excludeCredentials: existing,
    });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: input.workspaceId,
      principalId: principal.id,
      identityId: identity.id,
      purpose: "registration",
      challenge,
      operation: null,
      expiresAt: this.#clock.now() + 5 * 60_000,
      createdAt: this.#clock.now(),
    });
    return { challengeId, options };
  }

  async finishPasskeyRegistration(actor: ActorContext, input: {
    challengeId: WebAuthnChallengeId;
    response: RegistrationResponseJSON;
    transports?: string[];
  }): Promise<{ identityId: AuthIdentityId }> {
    const record = await this.#requireChallenge(input.challengeId, "registration");
    await this.#assertActorOwnsPrincipal(actor, record.principalId);
    assertDomain(record.identityId, "IDENTITY_REQUIRED", "Registration identity is missing", 422);
    const verified = await this.#webauthn.verifyRegistration({
      response: input.response,
      expectedChallenge: record.challenge,
    });
    const credential: PasskeyCredential = {
      id: asPasskeyCredentialId(newId("passkey")),
      identityId: record.identityId,
      credentialId: verified.credentialId,
      publicKey: verified.publicKey,
      counter: verified.counter,
      transports: input.transports ?? [],
      aaguid: verified.aaguid ?? null,
      createdAt: this.#clock.now(),
      lastUsedAt: null,
    };
    await this.#store.createPasskey(credential);
    await this.#store.deleteChallenge(record.id);
    return { identityId: record.identityId };
  }

  async beginLogin(input: { workspaceId: WorkspaceId; principalId: PrincipalId; label: string }): Promise<{ challengeId: WebAuthnChallengeId; options: unknown }> {
    const principal = await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    const identity = await this.#store.getIdentityByLabel(input.workspaceId, principal.id, input.label);
    assertDomain(identity && identity.state === "active", "AUTH_IDENTITY_NOT_FOUND", "Authentication identity not found", 404);
    const credentials = await this.#store.listPasskeysForIdentity(identity.id);
    assertDomain(credentials.length > 0, "PASSKEY_NOT_FOUND", "No passkeys registered for this identity", 404);
    const { options, challenge } = await this.#webauthn.authenticationOptions({ allowCredentials: credentials });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: input.workspaceId,
      principalId: principal.id,
      identityId: identity.id,
      purpose: "authentication",
      challenge,
      operation: null,
      expiresAt: this.#clock.now() + 5 * 60_000,
      createdAt: this.#clock.now(),
    });
    return { challengeId, options };
  }

  /** Preview / PoC only: session without WebAuthn; pre-grants step-up for owner workflows. */
  async issueInstantOwnerSession(input: {
    workspaceId: WorkspaceId;
    principalId: PrincipalId;
    userAgent?: string | null;
    ipHint?: string | null;
  }): Promise<SessionIssueResult> {
    await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    const issue = await this.#issueSession({
      workspaceId: input.workspaceId,
      principalId: input.principalId,
      userAgent: input.userAgent ?? null,
      ipHint: input.ipHint ?? null,
    });
    await this.#grantOwnerStepUps(issue.session.id, issue.session.expiresAt);
    return issue;
  }

  /** Verified Cloudflare identity (OAuth or Access JWT). Grants owner step-up (no passkey on trial sites). */
  async issueCloudflareIdentitySession(input: {
    workspaceId: WorkspaceId;
    principalId: PrincipalId;
    userAgent?: string | null;
    ipHint?: string | null;
  }): Promise<SessionIssueResult> {
    await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    const issue = await this.#issueSession({
      workspaceId: input.workspaceId,
      principalId: input.principalId,
      userAgent: input.userAgent ?? null,
      ipHint: input.ipHint ?? null,
    });
    await this.#grantOwnerStepUps(issue.session.id, issue.session.expiresAt);
    return issue;
  }

  async finishLogin(input: {
    challengeId: WebAuthnChallengeId;
    response: AuthenticationResponseJSON;
    userAgent?: string | null;
    ipHint?: string | null;
  }): Promise<SessionIssueResult> {
    const record = await this.#requireChallenge(input.challengeId, "authentication");
    assertDomain(record.identityId, "IDENTITY_REQUIRED", "Authentication identity is missing", 422);
    const passkey = await this.#store.getPasskeyByCredentialId(input.response.id);
    assertDomain(passkey, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    const verified = await this.#webauthn.verifyAuthentication({
      response: input.response,
      expectedChallenge: record.challenge,
      credential: passkey,
    });
    await this.#store.updatePasskeyCounter(passkey.id, verified.counter, this.#clock.now());
    await this.#store.deleteChallenge(record.id);
    assertDomain(record.principalId, "PRINCIPAL_REQUIRED", "Principal is required", 422);
    return this.#issueSession({
      workspaceId: record.workspaceId,
      principalId: record.principalId,
      userAgent: input.userAgent ?? null,
      ipHint: input.ipHint ?? null,
    });
  }

  async beginStepUp(actor: ActorContext, operation: StepUpOperation): Promise<{ challengeId: WebAuthnChallengeId; options: unknown; operation: StepUpOperation }> {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "An authenticated session is required for step-up", 401);
    assertDomain(actor.actorType === "human", "STEP_UP_HUMAN_ONLY", "Only human principals can perform step-up authentication", 403);
    const session = await this.#requireActiveSession(actor.authSessionId);
    assertDomain(session.principalId === actor.actorId, "SESSION_PRINCIPAL_MISMATCH", "Session does not belong to the actor", 403);
    const identities = await this.#store.listIdentitiesForPrincipal(actor.actorId);
    const credentials: PasskeyCredential[] = [];
    for (const identity of identities) {
      credentials.push(...await this.#store.listPasskeysForIdentity(identity.id));
    }
    assertDomain(credentials.length > 0, "PASSKEY_NOT_FOUND", "No passkeys available for step-up", 404);
    const { options, challenge } = await this.#webauthn.authenticationOptions({ allowCredentials: credentials });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: session.workspaceId,
      principalId: actor.actorId,
      identityId: null,
      purpose: "step-up",
      challenge,
      operation,
      expiresAt: this.#clock.now() + 5 * 60_000,
      createdAt: this.#clock.now(),
    });
    return { challengeId, options, operation };
  }

  async finishStepUp(actor: ActorContext, input: {
    challengeId: WebAuthnChallengeId;
    response: AuthenticationResponseJSON;
  }): Promise<{ operation: StepUpOperation; expiresAt: number }> {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "An authenticated session is required for step-up", 401);
    const record = await this.#requireChallenge(input.challengeId, "step-up");
    assertDomain(record.operation, "STEP_UP_OPERATION_REQUIRED", "Step-up operation is missing", 422);
    const passkey = await this.#store.getPasskeyByCredentialId(input.response.id);
    assertDomain(passkey, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    await this.#webauthn.verifyAuthentication({
      response: input.response,
      expectedChallenge: record.challenge,
      credential: passkey,
    });
    await this.#store.deleteChallenge(record.id);
    const expiresAt = this.#clock.now() + this.#stepUpTtlMs;
    await this.#store.upsertStepUp({
      id: asSessionStepUpId(newId("sessionStepUp")),
      sessionId: actor.authSessionId,
      operation: record.operation,
      expiresAt,
      createdAt: this.#clock.now(),
    });
    return { operation: record.operation as StepUpOperation, expiresAt };
  }

  async assertStepUp(actor: ActorContext, input: { action: string; capability: Capability; risk: RiskLevel }): Promise<void> {
    if (actor.authenticationMethod !== "session" || !actor.authSessionId) return;
    const operation = requiredStepUpOperation(input);
    if (!operation) return;
    if (actor.actorType !== "human") {
      throw new DomainError("STEP_UP_REQUIRED", "Step-up authentication is required for this operation", 403, { operation });
    }
    if (!actor.authSessionId) {
      throw new DomainError("SESSION_REQUIRED", "A server-side session is required for this operation", 401, { operation });
    }
    const stepUp = await this.#store.getStepUp(actor.authSessionId, operation, this.#clock.now());
    if (!stepUp) {
      throw new DomainError("STEP_UP_REQUIRED", "Recent step-up authentication is required for this operation", 403, { operation });
    }
  }

  async resolveSessionFromRequest(request: Request): Promise<AuthSession | null> {
    const cookies = parseCookies(request.headers.get("cookie"));
    const token = cookies.get(SESSION_COOKIE);
    if (!token) return null;
    const tokenHash = await hashSecret(token);
    const session = await this.#store.getSessionByTokenHash(tokenHash);
    const now = this.#clock.now();
    if (!session || session.revokedAt !== null || session.expiresAt <= now) return null;
    if (now - session.lastSeenAt >= this.#sessionTouchIntervalMs) {
      session.lastSeenAt = now;
      await this.#store.updateSession(session);
    }
    return session;
  }

  actorFromSession(session: AuthSession, request: Request): ActorContext {
    return {
      actorId: session.principalId,
      actorType: "human",
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      authSessionId: session.id,
      authenticationMethod: "session",
    };
  }

  async assertCsrf(request: Request, session: AuthSession): Promise<void> {
    await assertCsrfForMutation(request, session.csrfTokenHash);
  }

  async logout(actor: ActorContext): Promise<void> {
    if (!actor.authSessionId) return;
    const session = await this.#store.getSession(actor.authSessionId);
    if (!session) return;
    session.revokedAt = this.#clock.now();
    await this.#store.updateSession(session);
    await this.#store.deleteStepUpsForSession(session.id);
  }

  async getSessionView(actor: ActorContext): Promise<{ sessionId: AuthSessionId; principalId: PrincipalId; expiresAt: number }> {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "No active session", 401);
    const session = await this.#requireActiveSession(actor.authSessionId);
    return { sessionId: session.id, principalId: session.principalId, expiresAt: session.expiresAt };
  }

  async listSessions(actor: ActorContext): Promise<Array<{ id: AuthSessionId; createdAt: number; expiresAt: number; lastSeenAt: number; current: boolean }>> {
    const sessions = await this.#store.listSessionsForPrincipal(actor.actorId);
    const now = this.#clock.now();
    return sessions
      .filter((session) => session.revokedAt === null && session.expiresAt > now)
      .map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastSeenAt: session.lastSeenAt,
        current: session.id === actor.authSessionId,
      }));
  }

  async revokeSession(actor: ActorContext, sessionId: AuthSessionId): Promise<void> {
    const session = await this.#store.getSession(sessionId);
    assertDomain(session, "SESSION_NOT_FOUND", "Session not found", 404);
    assertDomain(session.principalId === actor.actorId, "SESSION_FORBIDDEN", "Cannot revoke another principal's session", 403);
    session.revokedAt = this.#clock.now();
    await this.#store.updateSession(session);
    if (session.id === actor.authSessionId) {
      await this.#store.deleteStepUpsForSession(session.id);
    }
  }

  async revokeAllSessions(actor: ActorContext): Promise<void> {
    await this.assertStepUp(actor, { action: "session.revoke-all", capability: "session.revoke-all", risk: "high" });
    const sessions = await this.#store.listSessionsForPrincipal(actor.actorId);
    const now = this.#clock.now();
    for (const session of sessions) {
      if (session.revokedAt !== null) continue;
      session.revokedAt = now;
      await this.#store.updateSession(session);
      await this.#store.deleteStepUpsForSession(session.id);
    }
  }

  sessionCookieHeaders(issue: SessionIssueResult): string[] {
    const maxAge = Math.floor(this.#sessionTtlMs / 1000);
    const secure = this.#secureCookies;
    return [
      serializeCookie(SESSION_COOKIE, issue.sessionToken, { maxAgeSeconds: maxAge, httpOnly: true, secure, sameSite: "Lax" }),
      serializeCookie("baser_csrf", issue.csrfToken, { maxAgeSeconds: maxAge, httpOnly: false, secure, sameSite: "Lax" }),
    ];
  }

  clearSessionCookieHeaders(): string[] {
    return [clearCookie(SESSION_COOKIE), clearCookie("baser_csrf")];
  }

  async #grantOwnerStepUps(sessionId: AuthSession["id"], expiresAt?: number): Promise<void> {
    const stepExpiresAt = expiresAt ?? this.#clock.now() + this.#stepUpTtlMs;
    const createdAt = this.#clock.now();
    for (const operation of Object.values(StepUpOperations)) {
      await this.#store.upsertStepUp({
        id: asSessionStepUpId(newId("sessionStepUp")),
        sessionId,
        operation,
        expiresAt: stepExpiresAt,
        createdAt,
      });
    }
  }

  async #issueSession(input: {
    workspaceId: WorkspaceId;
    principalId: PrincipalId;
    userAgent: string | null;
    ipHint: string | null;
  }): Promise<SessionIssueResult> {
    const now = this.#clock.now();
    const sessionToken = randomToken();
    const csrfToken = randomToken(24);
    const session: AuthSession = {
      id: asAuthSessionId(newId("authSession")),
      workspaceId: input.workspaceId,
      principalId: input.principalId,
      tokenHash: await hashSecret(sessionToken),
      csrfTokenHash: await hashSecret(csrfToken),
      userAgent: input.userAgent,
      ipHint: input.ipHint,
      createdAt: now,
      expiresAt: now + this.#sessionTtlMs,
      rotatedAt: null,
      revokedAt: null,
      lastSeenAt: now,
    };
    await this.#store.createSession(session);
    return { session, sessionToken, csrfToken };
  }

  async #assertRegistrationAuthority(actor: ActorContext, input: { workspaceId: WorkspaceId; principalId: PrincipalId; bootstrapSecret?: string }): Promise<void> {
    if (actor.authenticationMethod === "session" || actor.authSessionId) {
      await this.#assertActorOwnsPrincipal(actor, input.principalId);
      return;
    }
    if (actor.authenticationMethod === "dev-header" && actor.actorId === input.principalId) {
      return;
    }
    if (this.#bootstrapSecret && input.bootstrapSecret === this.#bootstrapSecret && actor.actorId === input.principalId) {
      return;
    }
    throw new DomainError("REGISTRATION_FORBIDDEN", "Passkey registration requires an authenticated session or bootstrap secret", 403);
  }

  async #assertActorOwnsPrincipal(actor: ActorContext, principalId: PrincipalId | null): Promise<void> {
    assertDomain(principalId, "PRINCIPAL_REQUIRED", "Principal is required", 422);
    assertDomain(actor.actorId === principalId, "PRINCIPAL_MISMATCH", "Actor cannot register passkeys for another principal", 403);
    assertDomain(actor.actorType === "human", "HUMAN_ONLY", "Only human principals can manage authentication identities", 403);
  }

  async #requireHumanPrincipal(principalId: PrincipalId, workspaceId: WorkspaceId) {
    const principal = await this.#principals.getPrincipal(principalId);
    assertDomain(principal, "PRINCIPAL_NOT_FOUND", "Principal not found", 404);
    assertDomain(principal.type === "human", "HUMAN_PRINCIPAL_REQUIRED", "Authentication identities can only be linked to human principals", 422);
    assertDomain(principal.workspaceId === workspaceId, "WORKSPACE_MISMATCH", "Principal belongs to another workspace", 403);
    assertDomain(principal.state === "active", "PRINCIPAL_DISABLED", "Principal is disabled", 403);
    return principal;
  }

  async #requireChallenge(id: WebAuthnChallengeId, purpose: "registration" | "authentication" | "step-up") {
    const record = await this.#store.getChallenge(id);
    assertDomain(record, "CHALLENGE_NOT_FOUND", "WebAuthn challenge not found", 404);
    assertDomain(record.purpose === purpose, "CHALLENGE_PURPOSE_MISMATCH", "WebAuthn challenge purpose mismatch", 422);
    assertDomain(record.expiresAt > this.#clock.now(), "CHALLENGE_EXPIRED", "WebAuthn challenge has expired", 410);
    return record;
  }

  async #requireActiveSession(id: AuthSessionId): Promise<AuthSession> {
    const session = await this.#store.getSession(id);
    assertDomain(session, "SESSION_NOT_FOUND", "Session not found", 404);
    assertDomain(session.revokedAt === null, "SESSION_REVOKED", "Session has been revoked", 401);
    assertDomain(session.expiresAt > this.#clock.now(), "SESSION_EXPIRED", "Session has expired", 401);
    return session;
  }
}

export function actorFromDevHeaders(request: Request): ActorContext {
  const principalId = request.headers.get("x-baser-principal-id");
  const type = request.headers.get("x-baser-principal-type");
  if (!principalId || !isPrincipalType(type)) {
    throw new DomainError("AUTHENTICATION_REQUIRED", "Principal headers are required", 401);
  }
  const context: ActorContext = {
    actorId: asPrincipalId(principalId),
    actorType: type,
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    authenticationMethod: "dev-header",
  };
  const onBehalfOf = request.headers.get("x-baser-on-behalf-of");
  const delegationId = request.headers.get("x-baser-delegation-id");
  if (onBehalfOf) context.onBehalfOf = asPrincipalId(onBehalfOf);
  if (delegationId) context.delegationId = delegationId as NonNullable<ActorContext["delegationId"]>;
  return context;
}

function isPrincipalType(value: unknown): value is PrincipalType {
  return value === "human" || value === "agent" || value === "service" || value === "external-client";
}
