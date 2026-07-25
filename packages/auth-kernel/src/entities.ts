import type {
  AuthIdentityId,
  AuthSessionId,
  PasskeyCredentialId,
  PrincipalId,
  SessionStepUpId,
  WebAuthnChallengeId,
  WorkspaceId,
} from "@baser-edge/core-types";

export type WebAuthnPurpose = "registration" | "authentication" | "step-up";

export interface AuthIdentity {
  id: AuthIdentityId;
  workspaceId: WorkspaceId;
  principalId: PrincipalId;
  label: string;
  state: "active" | "disabled";
  createdAt: number;
}

export interface PasskeyCredential {
  id: PasskeyCredentialId;
  identityId: AuthIdentityId;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
  aaguid: string | null;
  createdAt: number;
  lastUsedAt: number | null;
}

export interface WebAuthnChallengeRecord {
  id: WebAuthnChallengeId;
  workspaceId: WorkspaceId;
  principalId: PrincipalId | null;
  identityId: AuthIdentityId | null;
  purpose: WebAuthnPurpose;
  challenge: string;
  operation: string | null;
  expiresAt: number;
  createdAt: number;
}

export interface AuthSession {
  id: AuthSessionId;
  workspaceId: WorkspaceId;
  principalId: PrincipalId;
  tokenHash: string;
  csrfTokenHash: string;
  userAgent: string | null;
  ipHint: string | null;
  createdAt: number;
  expiresAt: number;
  rotatedAt: number | null;
  revokedAt: number | null;
  lastSeenAt: number;
}

export interface SessionStepUp {
  id: SessionStepUpId;
  sessionId: AuthSessionId;
  operation: string;
  expiresAt: number;
  createdAt: number;
}

export interface SessionIssueResult {
  session: AuthSession;
  sessionToken: string;
  csrfToken: string;
}

export const SESSION_COOKIE = "baser_session";
export const CSRF_COOKIE = "baser_csrf";
export const CSRF_HEADER = "x-baser-csrf-token";

export const STEP_UP_TTL_MS = 5 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
