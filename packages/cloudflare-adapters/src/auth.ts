import {
  asAuthIdentityId,
  asAuthSessionId,
  asPasskeyCredentialId,
  asPrincipalId,
  asSessionStepUpId,
  asWebAuthnChallengeId,
  asWorkspaceId,
  type AuthIdentityId,
  type AuthSessionId,
  type PasskeyCredentialId,
  type PrincipalId,
  type WebAuthnChallengeId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import type { AuthStore } from "@baser-edge/auth-kernel";
import type {
  AuthIdentity,
  AuthSession,
  PasskeyCredential,
  SessionStepUp,
  WebAuthnChallengeRecord,
} from "@baser-edge/auth-kernel";

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface Database {
  prepare(query: string): Statement;
}

export class D1AuthStore implements AuthStore {
  readonly #db: Database;
  constructor(db: Database) { this.#db = db; }

  async createIdentity(identity: AuthIdentity): Promise<void> {
    await this.#db.prepare("INSERT INTO auth_identities(id,workspace_id,principal_id,label,state,created_at) VALUES(?,?,?,?,?,?)")
      .bind(identity.id, identity.workspaceId, identity.principalId, identity.label, identity.state, identity.createdAt).run();
  }

  async getIdentity(id: AuthIdentityId): Promise<AuthIdentity | null> {
    const row = await this.#db.prepare("SELECT * FROM auth_identities WHERE id=?").bind(id).first<Record<string, unknown>>();
    return row ? mapIdentity(row) : null;
  }

  async getIdentityByLabel(workspaceId: WorkspaceId, principalId: PrincipalId, label: string): Promise<AuthIdentity | null> {
    const row = await this.#db.prepare("SELECT * FROM auth_identities WHERE workspace_id=? AND principal_id=? AND label=?")
      .bind(workspaceId, principalId, label).first<Record<string, unknown>>();
    return row ? mapIdentity(row) : null;
  }

  async listIdentitiesForPrincipal(principalId: PrincipalId): Promise<AuthIdentity[]> {
    const rows = await this.#db.prepare("SELECT * FROM auth_identities WHERE principal_id=?").bind(principalId).all<Record<string, unknown>>();
    return rows.results.map(mapIdentity);
  }

  async createPasskey(credential: PasskeyCredential): Promise<void> {
    await this.#db.prepare("INSERT INTO passkey_credentials(id,identity_id,credential_id,public_key,counter,transports_json,aaguid,created_at,last_used_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(credential.id, credential.identityId, credential.credentialId, credential.publicKey, credential.counter, JSON.stringify(credential.transports), credential.aaguid, credential.createdAt, credential.lastUsedAt).run();
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const row = await this.#db.prepare("SELECT * FROM passkey_credentials WHERE credential_id=?").bind(credentialId).first<Record<string, unknown>>();
    return row ? mapPasskey(row) : null;
  }

  async listPasskeysForIdentity(identityId: AuthIdentityId): Promise<PasskeyCredential[]> {
    const rows = await this.#db.prepare("SELECT * FROM passkey_credentials WHERE identity_id=?").bind(identityId).all<Record<string, unknown>>();
    return rows.results.map(mapPasskey);
  }

  async updatePasskeyCounter(id: PasskeyCredentialId, counter: number, lastUsedAt: number): Promise<void> {
    await this.#db.prepare("UPDATE passkey_credentials SET counter=?, last_used_at=? WHERE id=?").bind(counter, lastUsedAt, id).run();
  }

  async createChallenge(record: WebAuthnChallengeRecord): Promise<void> {
    await this.#db.prepare("INSERT INTO webauthn_challenges(id,workspace_id,principal_id,identity_id,purpose,challenge,operation,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(record.id, record.workspaceId, record.principalId, record.identityId, record.purpose, record.challenge, record.operation, record.expiresAt, record.createdAt).run();
  }

  async getChallenge(id: WebAuthnChallengeId): Promise<WebAuthnChallengeRecord | null> {
    const row = await this.#db.prepare("SELECT * FROM webauthn_challenges WHERE id=?").bind(id).first<Record<string, unknown>>();
    return row ? mapChallenge(row) : null;
  }

  async deleteChallenge(id: WebAuthnChallengeId): Promise<void> {
    await this.#db.prepare("DELETE FROM webauthn_challenges WHERE id=?").bind(id).run();
  }

  async createSession(session: AuthSession): Promise<void> {
    await this.#db.prepare("INSERT INTO auth_sessions(id,workspace_id,principal_id,token_hash,csrf_token_hash,user_agent,ip_hint,created_at,expires_at,rotated_at,revoked_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(session.id, session.workspaceId, session.principalId, session.tokenHash, session.csrfTokenHash, session.userAgent, session.ipHint, session.createdAt, session.expiresAt, session.rotatedAt, session.revokedAt, session.lastSeenAt).run();
  }

  async getSession(id: AuthSessionId): Promise<AuthSession | null> {
    const row = await this.#db.prepare("SELECT * FROM auth_sessions WHERE id=?").bind(id).first<Record<string, unknown>>();
    return row ? mapSession(row) : null;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const row = await this.#db.prepare("SELECT * FROM auth_sessions WHERE token_hash=?").bind(tokenHash).first<Record<string, unknown>>();
    return row ? mapSession(row) : null;
  }

  async updateSession(session: AuthSession): Promise<void> {
    await this.#db.prepare("UPDATE auth_sessions SET token_hash=?, csrf_token_hash=?, user_agent=?, ip_hint=?, expires_at=?, rotated_at=?, revoked_at=?, last_seen_at=? WHERE id=?")
      .bind(session.tokenHash, session.csrfTokenHash, session.userAgent, session.ipHint, session.expiresAt, session.rotatedAt, session.revokedAt, session.lastSeenAt, session.id).run();
  }

  async listSessionsForPrincipal(principalId: PrincipalId): Promise<AuthSession[]> {
    const rows = await this.#db.prepare("SELECT * FROM auth_sessions WHERE principal_id=?").bind(principalId).all<Record<string, unknown>>();
    return rows.results.map(mapSession);
  }

  async upsertStepUp(stepUp: SessionStepUp): Promise<void> {
    await this.#db.prepare("INSERT INTO session_step_ups(id,session_id,operation,expires_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT(session_id, operation) DO UPDATE SET id=excluded.id, expires_at=excluded.expires_at, created_at=excluded.created_at")
      .bind(stepUp.id, stepUp.sessionId, stepUp.operation, stepUp.expiresAt, stepUp.createdAt).run();
  }

  async getStepUp(sessionId: AuthSessionId, operation: string, now: number): Promise<SessionStepUp | null> {
    const row = await this.#db.prepare("SELECT * FROM session_step_ups WHERE session_id=? AND operation=? AND expires_at>?")
      .bind(sessionId, operation, now).first<Record<string, unknown>>();
    return row ? mapStepUp(row) : null;
  }

  async deleteStepUpsForSession(sessionId: AuthSessionId): Promise<void> {
    await this.#db.prepare("DELETE FROM session_step_ups WHERE session_id=?").bind(sessionId).run();
  }
}

function mapIdentity(row: Record<string, unknown>): AuthIdentity {
  return {
    id: asAuthIdentityId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: asPrincipalId(String(row.principal_id)),
    label: String(row.label),
    state: row.state === "disabled" ? "disabled" : "active",
    createdAt: Number(row.created_at),
  };
}

function mapPasskey(row: Record<string, unknown>): PasskeyCredential {
  const publicKey = row.public_key instanceof Uint8Array ? row.public_key : new Uint8Array(row.public_key as ArrayBuffer);
  return {
    id: asPasskeyCredentialId(String(row.id)),
    identityId: asAuthIdentityId(String(row.identity_id)),
    credentialId: String(row.credential_id),
    publicKey,
    counter: Number(row.counter),
    transports: JSON.parse(String(row.transports_json)) as string[],
    aaguid: row.aaguid === null || row.aaguid === undefined ? null : String(row.aaguid),
    createdAt: Number(row.created_at),
    lastUsedAt: row.last_used_at === null || row.last_used_at === undefined ? null : Number(row.last_used_at),
  };
}

function mapChallenge(row: Record<string, unknown>): WebAuthnChallengeRecord {
  return {
    id: asWebAuthnChallengeId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: row.principal_id === null ? null : asPrincipalId(String(row.principal_id)),
    identityId: row.identity_id === null ? null : asAuthIdentityId(String(row.identity_id)),
    purpose: String(row.purpose) as WebAuthnChallengeRecord["purpose"],
    challenge: String(row.challenge),
    operation: row.operation === null ? null : String(row.operation),
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at),
  };
}

function mapSession(row: Record<string, unknown>): AuthSession {
  return {
    id: asAuthSessionId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: asPrincipalId(String(row.principal_id)),
    tokenHash: String(row.token_hash),
    csrfTokenHash: String(row.csrf_token_hash),
    userAgent: row.user_agent === null ? null : String(row.user_agent),
    ipHint: row.ip_hint === null ? null : String(row.ip_hint),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    rotatedAt: row.rotated_at === null ? null : Number(row.rotated_at),
    revokedAt: row.revoked_at === null ? null : Number(row.revoked_at),
    lastSeenAt: Number(row.last_seen_at),
  };
}

function mapStepUp(row: Record<string, unknown>): SessionStepUp {
  return {
    id: asSessionStepUpId(String(row.id)),
    sessionId: asAuthSessionId(String(row.session_id)),
    operation: String(row.operation),
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at),
  };
}
