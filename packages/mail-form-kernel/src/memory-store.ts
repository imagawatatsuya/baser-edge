import { DomainError, type ContentItemId, type MailConfirmationId, type MailFormId, type MailNotificationId, type MailSubmissionId, type SiteId } from "@baser-edge/core-types";
import type { MailConfirmationSession, MailFormDefinition, MailFormFieldPolicy, MailNotification, MailSubmission, MailSubmissionPayload, MailSubmissionView } from "./entities.js";
import type { MailFormStore } from "./store.js";

export class MemoryMailFormStore implements MailFormStore {
  readonly forms = new Map<MailFormId, MailFormDefinition>();
  readonly byContent = new Map<ContentItemId, MailFormId>();
  readonly policies = new Map<string, MailFormFieldPolicy>();
  readonly confirmations = new Map<MailConfirmationId, MailConfirmationSession>();
  readonly submissions = new Map<MailSubmissionId, MailSubmission>();
  readonly payloads = new Map<MailSubmissionId, MailSubmissionPayload>();
  readonly notifications = new Map<MailNotificationId, MailNotification>();

  async createForm(definition: MailFormDefinition, policies: MailFormFieldPolicy[]): Promise<void> {
    if (this.byContent.has(definition.contentItemId)) throw new DomainError("MAIL_FORM_EXISTS", "Mail form already exists", 409);
    this.forms.set(definition.id, clone(definition)); this.byContent.set(definition.contentItemId, definition.id);
    for (const policy of policies) this.policies.set(`${policy.mailFormId}:${policy.fieldId}`, clone(policy));
  }
  async getForm(id: MailFormId): Promise<MailFormDefinition | null> { return maybe(this.forms.get(id)); }
  async getFormByContentItem(contentItemId: ContentItemId): Promise<MailFormDefinition | null> { const id=this.byContent.get(contentItemId); return id?this.getForm(id):null; }
  async listForms(siteId: SiteId): Promise<MailFormDefinition[]> { return [...this.forms.values()].filter((v)=>v.siteId===siteId).map(clone); }
  async listFieldPolicies(mailFormId: MailFormId): Promise<MailFormFieldPolicy[]> { return [...this.policies.values()].filter((v)=>v.mailFormId===mailFormId).map(clone); }
  async createConfirmation(session: MailConfirmationSession): Promise<void> { this.confirmations.set(session.id, clone(session)); }
  async getConfirmation(id: MailConfirmationId): Promise<MailConfirmationSession | null> { return maybe(this.confirmations.get(id)); }
  async acceptSubmission(input: { confirmationId: MailConfirmationId; submission: MailSubmission; payload: MailSubmissionPayload; notifications: MailNotification[]; now: number }): Promise<MailSubmission> {
    const confirmation=this.confirmations.get(input.confirmationId);
    if(!confirmation) throw new DomainError("MAIL_CONFIRMATION_NOT_FOUND","Confirmation not found",404);
    if(confirmation.usedAt!==null) throw new DomainError("MAIL_CONFIRMATION_USED","Confirmation has already been submitted",409);
    if(confirmation.expiresAt<input.now) throw new DomainError("MAIL_CONFIRMATION_EXPIRED","Confirmation has expired",410);
    confirmation.usedAt=input.now;
    this.submissions.set(input.submission.id,clone(input.submission)); this.payloads.set(input.payload.submissionId,clone(input.payload));
    for(const notification of input.notifications)this.notifications.set(notification.id,clone(notification));
    return clone(input.submission);
  }
  async getSubmission(id: MailSubmissionId): Promise<MailSubmissionView | null> { const s=this.submissions.get(id); if(!s)return null; return {submission:clone(s),values:s.payloadState==="available"?clone(this.payloads.get(id)?.values??null):null,redacted:false}; }
  async listSubmissions(mailFormId: MailFormId): Promise<MailSubmissionView[]> { const result=[];for(const s of this.submissions.values())if(s.mailFormId===mailFormId)result.push((await this.getSubmission(s.id))!);return result.sort((a,b)=>b.submission.receivedAt-a.submission.receivedAt); }
  async purgeSubmission(id: MailSubmissionId, now: number): Promise<MailSubmission> { const s=this.submissions.get(id);if(!s)throw new DomainError("MAIL_SUBMISSION_NOT_FOUND","Submission not found",404);this.payloads.delete(id);s.payloadState="purged";return clone(s); }
  async listPendingNotifications(limit:number,now:number):Promise<MailNotification[]>{return [...this.notifications.values()].filter((n)=>n.state==="pending"&&n.availableAt<=now).sort((a,b)=>a.availableAt-b.availableAt).slice(0,limit).map(clone);}
  async getNotification(id:MailNotificationId):Promise<MailNotification|null>{return maybe(this.notifications.get(id));}
  async listNotificationsForSubmission(id:MailSubmissionId):Promise<MailNotification[]>{return [...this.notifications.values()].filter((n)=>n.submissionId===id).map(clone);}
  async updateNotification(n:MailNotification):Promise<void>{if(!this.notifications.has(n.id))throw new DomainError("MAIL_NOTIFICATION_NOT_FOUND","Notification not found",404);this.notifications.set(n.id,clone(n));}
  async updateSubmissionState(id:MailSubmissionId,state:MailSubmission["state"]):Promise<void>{const s=this.submissions.get(id);if(!s)throw new DomainError("MAIL_SUBMISSION_NOT_FOUND","Submission not found",404);s.state=state;}
}
function clone<T>(v:T):T{return structuredClone(v);} function maybe<T>(v:T|undefined):T|null{return v===undefined?null:clone(v);}
