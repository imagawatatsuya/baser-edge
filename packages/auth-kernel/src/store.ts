import type {
  AuthIdentity,
  AuthSession,
  PasskeyCredential,
  SessionStepUp,
  WebAuthnChallengeRecord,
} from "./entities.js";
import type {
  AuthIdentityId,
  AuthSessionId,
  PasskeyCredentialId,
  PrincipalId,
  SessionStepUpId,
  WebAuthnChallengeId,
  WorkspaceId,
} from "@baser-edge/core-types";

export interface AuthStore {
  createIdentity(identity: AuthIdentity): Promise<void>;
  getIdentity(id: AuthIdentityId): Promise<AuthIdentity | null>;
  getIdentityByLabel(workspaceId: WorkspaceId, principalId: PrincipalId, label: string): Promise<AuthIdentity | null>;
  listIdentitiesForPrincipal(principalId: PrincipalId): Promise<AuthIdentity[]>;

  createPasskey(credential: PasskeyCredential): Promise<void>;
  getPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | null>;
  listPasskeysForIdentity(identityId: AuthIdentityId): Promise<PasskeyCredential[]>;
  updatePasskeyCounter(id: PasskeyCredentialId, counter: number, lastUsedAt: number): Promise<void>;

  createChallenge(record: WebAuthnChallengeRecord): Promise<void>;
  getChallenge(id: WebAuthnChallengeId): Promise<WebAuthnChallengeRecord | null>;
  deleteChallenge(id: WebAuthnChallengeId): Promise<void>;

  createSession(session: AuthSession): Promise<void>;
  getSession(id: AuthSessionId): Promise<AuthSession | null>;
  getSessionByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  updateSession(session: AuthSession): Promise<void>;
  listSessionsForPrincipal(principalId: PrincipalId): Promise<AuthSession[]>;

  upsertStepUp(stepUp: SessionStepUp): Promise<void>;
  getStepUp(sessionId: AuthSessionId, operation: string, now: number): Promise<SessionStepUp | null>;
  deleteStepUpsForSession(sessionId: AuthSessionId): Promise<void>;
}
