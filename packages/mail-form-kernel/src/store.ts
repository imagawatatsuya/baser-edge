import type { ContentItemId, MailConfirmationId, MailFormId, MailNotificationId, MailSubmissionId, SiteId } from "@baser-edge/core-types";
import type {
  MailConfirmationSession, MailFormDefinition, MailFormFieldPolicy, MailNotification,
  MailSubmission, MailSubmissionPayload, MailSubmissionView,
} from "./entities.js";

export interface MailFormStore {
  createForm(definition: MailFormDefinition, policies: MailFormFieldPolicy[]): Promise<void>;
  getForm(id: MailFormId): Promise<MailFormDefinition | null>;
  getFormByContentItem(contentItemId: ContentItemId): Promise<MailFormDefinition | null>;
  listForms(siteId: SiteId): Promise<MailFormDefinition[]>;
  listFieldPolicies(mailFormId: MailFormId): Promise<MailFormFieldPolicy[]>;
  createConfirmation(session: MailConfirmationSession): Promise<void>;
  getConfirmation(id: MailConfirmationId): Promise<MailConfirmationSession | null>;
  acceptSubmission(input: {
    confirmationId: MailConfirmationId;
    submission: MailSubmission;
    payload: MailSubmissionPayload;
    notifications: MailNotification[];
    now: number;
  }): Promise<MailSubmission>;
  getSubmission(id: MailSubmissionId): Promise<MailSubmissionView | null>;
  listSubmissions(mailFormId: MailFormId): Promise<MailSubmissionView[]>;
  purgeSubmission(id: MailSubmissionId, now: number): Promise<MailSubmission>;
  listPendingNotifications(limit: number, now: number): Promise<MailNotification[]>;
  getNotification(id: MailNotificationId): Promise<MailNotification | null>;
  listNotificationsForSubmission(submissionId: MailSubmissionId): Promise<MailNotification[]>;
  updateNotification(notification: MailNotification): Promise<void>;
  updateSubmissionState(id: MailSubmissionId, state: MailSubmission["state"]): Promise<void>;
}
