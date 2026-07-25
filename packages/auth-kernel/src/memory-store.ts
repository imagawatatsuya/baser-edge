import type { AuthStore } from "./store.js";
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
  WebAuthnChallengeId,
  WorkspaceId,
} from "@baser-edge/core-types";
import { DomainError, assertDomain } from "@baser-edge/core-types";

export class MemoryAuthStore implements AuthStore {
  readonly identities = new Map<AuthIdentityId, AuthIdentity>();
  readonly passkeys = new Map<PasskeyCredentialId, PasskeyCredential>();
  readonly passkeysByCredentialId = new Map<string, PasskeyCredentialId>();
  readonly challenges = new Map<WebAuthnChallengeId, WebAuthnChallengeRecord>();
  readonly sessions = new Map<AuthSessionId, AuthSession>();
  readonly sessionsByToken = new Map<string, AuthSessionId>();
  readonly stepUps = new Map<string, SessionStepUp>();

  async createIdentity(identity: AuthIdentity): Promise<void> {
    this.identities.set(identity.id, structuredClone(identity));
  }

  async getIdentity(id: AuthIdentityId): Promise<AuthIdentity | null> {
    const value = this.identities.get(id);
    return value ? structuredClone(value) : null;
  }

  async getIdentityByLabel(workspaceId: WorkspaceId, principalId: PrincipalId, label: string): Promise<AuthIdentity | null> {
    for (const identity of this.identities.values()) {
      if (identity.workspaceId === workspaceId && identity.principalId === principalId && identity.label === label) {
        return structuredClone(identity);
      }
    }
    return null;
  }

  async listIdentitiesForPrincipal(principalId: PrincipalId): Promise<AuthIdentity[]> {
    return [...this.identities.values()].filter((entry) => entry.principalId === principalId).map((entry) => structuredClone(entry));
  }

  async createPasskey(credential: PasskeyCredential): Promise<void> {
    assertDomain(!this.passkeysByCredentialId.has(credential.credentialId), "PASSKEY_EXISTS", "Passkey already registered", 409);
    this.passkeys.set(credential.id, structuredClone(credential));
    this.passkeysByCredentialId.set(credential.credentialId, credential.id);
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const id = this.passkeysByCredentialId.get(credentialId);
    if (!id) return null;
    const value = this.passkeys.get(id);
    return value ? structuredClone(value) : null;
  }

  async listPasskeysForIdentity(identityId: AuthIdentityId): Promise<PasskeyCredential[]> {
    return [...this.passkeys.values()].filter((entry) => entry.identityId === identityId).map((entry) => structuredClone(entry));
  }

  async updatePasskeyCounter(id: PasskeyCredentialId, counter: number, lastUsedAt: number): Promise<void> {
    const value = this.passkeys.get(id);
    assertDomain(value, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    value.counter = counter;
    value.lastUsedAt = lastUsedAt;
  }

  async createChallenge(record: WebAuthnChallengeRecord): Promise<void> {
    this.challenges.set(record.id, structuredClone(record));
  }

  async getChallenge(id: WebAuthnChallengeId): Promise<WebAuthnChallengeRecord | null> {
    const value = this.challenges.get(id);
    return value ? structuredClone(value) : null;
  }

  async deleteChallenge(id: WebAuthnChallengeId): Promise<void> {
    this.challenges.delete(id);
  }

  async createSession(session: AuthSession): Promise<void> {
    this.sessions.set(session.id, structuredClone(session));
    this.sessionsByToken.set(session.tokenHash, session.id);
  }

  async getSession(id: AuthSessionId): Promise<AuthSession | null> {
    const value = this.sessions.get(id);
    return value ? structuredClone(value) : null;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const id = this.sessionsByToken.get(tokenHash);
    if (!id) return null;
    return this.getSession(id);
  }

  async updateSession(session: AuthSession): Promise<void> {
    const existing = this.sessions.get(session.id);
    assertDomain(existing, "SESSION_NOT_FOUND", "Session not found", 404);
    if (existing.tokenHash !== session.tokenHash) {
      this.sessionsByToken.delete(existing.tokenHash);
      this.sessionsByToken.set(session.tokenHash, session.id);
    }
    this.sessions.set(session.id, structuredClone(session));
  }

  async listSessionsForPrincipal(principalId: PrincipalId): Promise<AuthSession[]> {
    return [...this.sessions.values()].filter((entry) => entry.principalId === principalId).map((entry) => structuredClone(entry));
  }

  async upsertStepUp(stepUp: SessionStepUp): Promise<void> {
    this.stepUps.set(`${stepUp.sessionId}:${stepUp.operation}`, structuredClone(stepUp));
  }

  async getStepUp(sessionId: AuthSessionId, operation: string, now: number): Promise<SessionStepUp | null> {
    const value = this.stepUps.get(`${sessionId}:${operation}`);
    if (!value || value.expiresAt <= now) return null;
    return structuredClone(value);
  }

  async deleteStepUpsForSession(sessionId: AuthSessionId): Promise<void> {
    for (const key of [...this.stepUps.keys()]) {
      if (key.startsWith(`${sessionId}:`)) this.stepUps.delete(key);
    }
  }
}

export const memoryAuthStore = new MemoryAuthStore();
