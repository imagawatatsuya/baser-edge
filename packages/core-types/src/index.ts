export type Brand<T, B extends string> = T & { readonly __brand: B };

export type WorkspaceId = Brand<string, "WorkspaceId">;
export type SiteId = Brand<string, "SiteId">;
export type PrincipalId = Brand<string, "PrincipalId">;
export type ContentItemId = Brand<string, "ContentItemId">;
export type RevisionId = Brand<string, "RevisionId">;
export type ContentNodeId = Brand<string, "ContentNodeId">;
export type RouteId = Brand<string, "RouteId">;
export type ApprovalId = Brand<string, "ApprovalId">;
export type AgentRunId = Brand<string, "AgentRunId">;
export type ChangeSetId = Brand<string, "ChangeSetId">;
export type AuditEventId = Brand<string, "AuditEventId">;
export type OutboxEventId = Brand<string, "OutboxEventId">;
export type DelegationId = Brand<string, "DelegationId">;
export type CapabilityGrantId = Brand<string, "CapabilityGrantId">;
export type AssetId = Brand<string, "AssetId">;
export type UploadSessionId = Brand<string, "UploadSessionId">;
export type PreviewSessionId = Brand<string, "PreviewSessionId">;
export type CollectionId = Brand<string, "CollectionId">;
export type TaxonomyId = Brand<string, "TaxonomyId">;
export type TermId = Brand<string, "TermId">;
export type CustomFieldId = Brand<string, "CustomFieldId">;
export type CustomTableId = Brand<string, "CustomTableId">;
export type CustomContentId = Brand<string, "CustomContentId">;
export type CustomEntryId = Brand<string, "CustomEntryId">;
export type CustomEntryRevisionId = Brand<string, "CustomEntryRevisionId">;
export type CustomEntryApprovalId = Brand<string, "CustomEntryApprovalId">;
export type MailFormId = Brand<string, "MailFormId">;
export type MailConfirmationId = Brand<string, "MailConfirmationId">;
export type MailSubmissionId = Brand<string, "MailSubmissionId">;
export type MailNotificationId = Brand<string, "MailNotificationId">;
export type ThemeId = Brand<string, "ThemeId">;
export type ThemeReleaseId = Brand<string, "ThemeReleaseId">;
export type DesignTokenRevisionId = Brand<string, "DesignTokenRevisionId">;
export type LayoutRevisionId = Brand<string, "LayoutRevisionId">;
export type ThemeActivationId = Brand<string, "ThemeActivationId">;
export type PluginId = Brand<string, "PluginId">;
export type PluginReleaseId = Brand<string, "PluginReleaseId">;
export type PluginActivationId = Brand<string, "PluginActivationId">;
export type PluginInvocationId = Brand<string, "PluginInvocationId">;
export type AuthIdentityId = Brand<string, "AuthIdentityId">;
export type PasskeyCredentialId = Brand<string, "PasskeyCredentialId">;
export type AuthSessionId = Brand<string, "AuthSessionId">;
export type WebAuthnChallengeId = Brand<string, "WebAuthnChallengeId">;
export type SessionStepUpId = Brand<string, "SessionStepUpId">;

export type PrincipalType = "human" | "agent" | "service" | "external-client";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AuthenticationMethod = "session" | "dev-header" | "service";

export interface ActorContext {
  actorId: PrincipalId;
  actorType: PrincipalType;
  requestId: string;
  onBehalfOf?: PrincipalId;
  delegationId?: DelegationId;
  authSessionId?: AuthSessionId;
  authenticationMethod?: AuthenticationMethod;
}

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

const PREFIXES = {
  workspace: "ws",
  site: "site",
  principal: "prn",
  content: "cnt",
  revision: "rev",
  node: "node",
  route: "route",
  redirect: "redir",
  approval: "apr",
  agentRun: "arun",
  changeSet: "chg",
  audit: "aud",
  outbox: "out",
  delegation: "del",
  grant: "grant",
  asset: "ast",
  upload: "upl",
  preview: "prv",
  collection: "col",
  taxonomy: "tax",
  term: "term",
  customField: "cfield",
  customTable: "ctbl",
  customContent: "cc",
  customEntry: "centry",
  customEntryRevision: "cerev",
  customEntryApproval: "ceapr",
  mailForm: "mform",
  mailConfirmation: "mconf",
  mailSubmission: "msub",
  mailNotification: "mnote",
  theme: "theme",
  themeRelease: "threl",
  designTokenRevision: "dtok",
  layoutRevision: "layout",
  themeActivation: "thact",
  plugin: "plug",
  pluginRelease: "plrel",
  pluginActivation: "plact",
  pluginInvocation: "plinv",
  authIdentity: "authid",
  passkey: "pkey",
  authSession: "sess",
  webauthnChallenge: "wchal",
  sessionStepUp: "stup",
} as const;

export type IdKind = keyof typeof PREFIXES;

export function newId<K extends IdKind>(kind: K): `${(typeof PREFIXES)[K]}_${string}` {
  return `${PREFIXES[kind]}_${crypto.randomUUID()}` as `${(typeof PREFIXES)[K]}_${string}`;
}

export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    if (details) this.details = details;
  }
}

export function assertDomain(
  condition: unknown,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): asserts condition {
  if (!condition) throw new DomainError(code, message, status, details);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function asWorkspaceId(value: string): WorkspaceId { return value as WorkspaceId; }
export function asSiteId(value: string): SiteId { return value as SiteId; }
export function asPrincipalId(value: string): PrincipalId { return value as PrincipalId; }
export function asContentItemId(value: string): ContentItemId { return value as ContentItemId; }
export function asRevisionId(value: string): RevisionId { return value as RevisionId; }
export function asContentNodeId(value: string): ContentNodeId { return value as ContentNodeId; }
export function asApprovalId(value: string): ApprovalId { return value as ApprovalId; }
export function asAgentRunId(value: string): AgentRunId { return value as AgentRunId; }
export function asChangeSetId(value: string): ChangeSetId { return value as ChangeSetId; }
export function asAssetId(value: string): AssetId { return value as AssetId; }
export function asUploadSessionId(value: string): UploadSessionId { return value as UploadSessionId; }
export function asPreviewSessionId(value: string): PreviewSessionId { return value as PreviewSessionId; }
export function asCollectionId(value: string): CollectionId { return value as CollectionId; }
export function asTaxonomyId(value: string): TaxonomyId { return value as TaxonomyId; }
export function asTermId(value: string): TermId { return value as TermId; }
export function asCustomFieldId(value: string): CustomFieldId { return value as CustomFieldId; }
export function asCustomTableId(value: string): CustomTableId { return value as CustomTableId; }
export function asCustomContentId(value: string): CustomContentId { return value as CustomContentId; }
export function asCustomEntryId(value: string): CustomEntryId { return value as CustomEntryId; }
export function asCustomEntryRevisionId(value: string): CustomEntryRevisionId { return value as CustomEntryRevisionId; }
export function asCustomEntryApprovalId(value: string): CustomEntryApprovalId { return value as CustomEntryApprovalId; }
export function asMailFormId(value: string): MailFormId { return value as MailFormId; }
export function asMailConfirmationId(value: string): MailConfirmationId { return value as MailConfirmationId; }
export function asMailSubmissionId(value: string): MailSubmissionId { return value as MailSubmissionId; }
export function asMailNotificationId(value: string): MailNotificationId { return value as MailNotificationId; }
export function asThemeId(value: string): ThemeId { return value as ThemeId; }
export function asThemeReleaseId(value: string): ThemeReleaseId { return value as ThemeReleaseId; }
export function asDesignTokenRevisionId(value: string): DesignTokenRevisionId { return value as DesignTokenRevisionId; }
export function asLayoutRevisionId(value: string): LayoutRevisionId { return value as LayoutRevisionId; }
export function asThemeActivationId(value: string): ThemeActivationId { return value as ThemeActivationId; }
export function asPluginId(value: string): PluginId { return value as PluginId; }
export function asPluginReleaseId(value: string): PluginReleaseId { return value as PluginReleaseId; }
export function asPluginActivationId(value: string): PluginActivationId { return value as PluginActivationId; }
export function asPluginInvocationId(value: string): PluginInvocationId { return value as PluginInvocationId; }
export function asAuthIdentityId(value: string): AuthIdentityId { return value as AuthIdentityId; }
export function asPasskeyCredentialId(value: string): PasskeyCredentialId { return value as PasskeyCredentialId; }
export function asAuthSessionId(value: string): AuthSessionId { return value as AuthSessionId; }
export function asWebAuthnChallengeId(value: string): WebAuthnChallengeId { return value as WebAuthnChallengeId; }
export function asSessionStepUpId(value: string): SessionStepUpId { return value as SessionStepUpId; }

export async function signCompactToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoded = base64UrlEncode(new TextEncoder().encode(stableStringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyCompactToken<T extends Record<string, unknown>>(token: string, secret: string): Promise<T | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || token.split(".").length !== 2) return null;
  try {
    if (!isCanonicalBase64Url(encoded) || !isCanonicalBase64Url(signature)) return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(encoded),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as T : null;
  } catch {
    return null;
  }
}

export function base64UrlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) throw new Error("Invalid base64url value");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isCanonicalBase64Url(value: string): boolean {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return false;
  try {
    return base64UrlEncode(base64UrlDecode(value)) === value;
  } catch {
    return false;
  }
}
