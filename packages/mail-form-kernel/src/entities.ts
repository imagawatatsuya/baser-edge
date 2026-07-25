import type {
  ContentItemId, CustomFieldId, CustomTableId, MailConfirmationId, MailFormId, MailNotificationId,
  MailSubmissionId, PrincipalId, SiteId, WorkspaceId,
} from "@baser-edge/core-types";

export type PrivacyClass = "non-personal" | "personal" | "sensitive";

export interface MailFormDefinition {
  id: MailFormId;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  tableId: CustomTableId;
  recipientEmails: string[];
  senderAddress: string;
  subjectTemplate: string;
  autoReplyEnabled: boolean;
  autoReplyEmailFieldKey: string | null;
  autoReplySubject: string;
  confirmationTtlSeconds: number;
  retentionDays: number;
  turnstileRequired: boolean;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface MailFormFieldPolicy {
  mailFormId: MailFormId;
  fieldId: CustomFieldId;
  privacyClass: PrivacyClass;
  includeInOwnerNotification: boolean;
  includeInAutoReply: boolean;
  createdAt: number;
}

export interface MailConfirmationSession {
  id: MailConfirmationId;
  mailFormId: MailFormId;
  schemaVersion: number;
  values: Record<string, unknown>;
  valuesHash: string;
  clientFingerprintHash: string;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}

export interface MailSubmission {
  id: MailSubmissionId;
  mailFormId: MailFormId;
  confirmationId: MailConfirmationId;
  schemaVersion: number;
  payloadHash: string;
  payloadState: "available" | "purged";
  clientFingerprintHash: string;
  receivedAt: number;
  purgeAt: number;
  state: "accepted" | "notification-pending" | "notified" | "notification-failed";
}

export interface MailSubmissionPayload {
  submissionId: MailSubmissionId;
  values: Record<string, unknown>;
  createdAt: number;
}

export interface MailNotification {
  id: MailNotificationId;
  submissionId: MailSubmissionId;
  kind: "owner" | "auto-reply";
  recipient: string;
  subject: string;
  state: "pending" | "sent" | "failed";
  attempts: number;
  availableAt: number;
  sentAt: number | null;
  lastError: string;
}

export interface MailSubmissionView {
  submission: MailSubmission;
  values: Record<string, unknown> | null;
  redacted: boolean;
}

export interface PreparedMailConfirmation {
  session: MailConfirmationSession;
  token: string;
}

export interface BotVerificationResult {
  success: boolean;
  hostname?: string;
  action?: string;
  errorCodes?: string[];
}

export interface BotVerifier {
  verify(input: { token: string; remoteIp?: string; idempotencyKey: string; expectedHostname?: string }): Promise<BotVerificationResult>;
}

export interface OutboundEmail {
  to: string;
  from: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface MailSender { send(message: OutboundEmail): Promise<void>; }

export interface MailNotificationDeliveryResult { sent: number; failed: number; }

export interface MailFormActorAudit {
  actorId: PrincipalId;
}
