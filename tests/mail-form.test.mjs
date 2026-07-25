import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { DomainError } from "@baser-edge/core-types";
import { Capabilities } from "@baser-edge/authorization";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createEmptyDocument } from "@baser-edge/structured-document";
import { CustomContentService, MemoryCustomContentStore } from "@baser-edge/custom-content-kernel";
import { MailFormService, MemoryMailFormStore, MemoryMailSender, TurnstileBotVerifier } from "@baser-edge/mail-form-kernel";
import { D1CmsStore, D1CustomContentStore, D1MailFormStore } from "@baser-edge/cloudflare-adapters";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";

async function publishContent(cms, owner, snapshot) {
  const approval = await cms.requestApproval(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  return cms.publish(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id, approvalId: approval.id });
}

async function prepare({ cms, custom, mail, hostname = "mail.test", turnstileRequired = false }) {
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname, ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const name = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "name", name: "お名前", type: "text" });
  const email = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "email", name: "メール", type: "email" });
  const message = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "message", name: "お問い合わせ内容", type: "textarea" });
  const secret = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "secret", name: "秘密情報", type: "text" });
  const table = await custom.createTable(owner, { workspaceId: boot.workspaceId, key: "contact_form", name: "お問い合わせ", kind: "content", displayFieldKey: "name" });
  await custom.attachField(owner, { tableId: table.id, fieldId: name.id, required: true, sortOrder: 10 });
  await custom.attachField(owner, { tableId: table.id, fieldId: email.id, required: true, sortOrder: 20 });
  await custom.attachField(owner, { tableId: table.id, fieldId: message.id, required: true, sortOrder: 30 });
  await custom.attachField(owner, { tableId: table.id, fieldId: secret.id, sortOrder: 40 });
  const created = await mail.createMailForm(owner, {
    siteId: boot.siteId, parentId: null, slug: "contact", title: "お問い合わせ", tableId: table.id,
    recipientEmails: ["owner@example.com"], senderAddress: "noreply@example.com",
    autoReplyEnabled: true, autoReplyEmailFieldKey: "email", turnstileRequired, retentionDays: 30,
    document: createEmptyDocument(),
    fieldPolicies: [
      { fieldId: name.id, privacyClass: "personal" },
      { fieldId: email.id, privacyClass: "personal" },
      { fieldId: message.id, privacyClass: "non-personal" },
      { fieldId: secret.id, privacyClass: "sensitive", includeInAutoReply: false },
    ],
  });
  await publishContent(cms, owner, created.snapshot);
  return { boot, owner, table, created, fields: { name, email, message, secret } };
}

function createMemoryServices(options = {}) {
  const cms = new CmsService(new MemoryCmsStore());
  const custom = new CustomContentService(new MemoryCustomContentStore(), cms);
  const sender = options.sender ?? new MemoryMailSender();
  const mail = new MailFormService({ store: new MemoryMailFormStore(), cms, customContent: custom, signingSecret: "mail-secret", privacySalt: "privacy-salt", sender, ...(options.botVerifier ? { botVerifier: options.botVerifier } : {}) });
  return { cms, custom, mail, sender };
}

test("Mail Form uses confirmation tokens, prevents replay, redacts PII, and delivers outbox mail", async () => {
  const { cms, custom, mail, sender } = createMemoryServices();
  const { boot, owner, created } = await prepare({ cms, custom, mail });
  const prepared = await mail.prepareConfirmation({ mailFormId: created.definition.id, values: { name: "山田太郎", email: "USER@EXAMPLE.COM", message: "資料をください", secret: "内部事情" }, remoteIp: "192.0.2.1", userAgent: "test" });
  assert.equal(prepared.session.values.email, "user@example.com");
  await assert.rejects(mail.submitConfirmation({ confirmationId: prepared.session.id, token: prepared.token.slice(0, -1) + "x" }), (error) => error instanceof DomainError && error.code === "MAIL_CONFIRMATION_TOKEN_INVALID");
  const submission = await mail.submitConfirmation({ confirmationId: prepared.session.id, token: prepared.token });
  await assert.rejects(mail.submitConfirmation({ confirmationId: prepared.session.id, token: prepared.token }), (error) => error instanceof DomainError && error.code === "MAIL_CONFIRMATION_USED");

  const list = await mail.listSubmissions(owner, created.definition.id);
  assert.equal(list.length, 1);
  assert.equal(list[0].values.message, "資料をください");
  assert.match(list[0].values.email, /\*\*\*@example\.com/);
  assert.equal(list[0].values.secret, "[sensitive]");
  const sensitive = await mail.getSubmission(owner, submission.id, { includeSensitive: true });
  assert.equal(sensitive.values.email, "user@example.com");
  assert.equal(sensitive.values.secret, "内部事情");

  const result = await mail.deliverPending(owner);
  assert.deepEqual(result, { sent: 2, failed: 0 });
  assert.equal(sender.sent.length, 2);
  assert.equal(sender.sent[0].replyTo, "user@example.com");
  assert.doesNotMatch(sender.sent[1].text, /内部事情/);

  const agent = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Agent" });
  const agentCapabilities = [Capabilities.MailSubmissionRead, Capabilities.MailSubmissionReadSensitive];
  for (const capability of agentCapabilities) await cms.grantCapability(owner, { principalId: agent.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  const delegation = await cms.createDelegation(owner, { humanPrincipalId: boot.ownerPrincipalId, agentPrincipalId: agent.id, capabilities: agentCapabilities, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId }, maximumRisk: "high", expiresAt: Date.now() + 60_000 });
  const agentView = await mail.getSubmission(actor(agent.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id }), submission.id, { includeSensitive: true });
  assert.match(agentView.values.email, /\*\*\*@example\.com/);
  assert.equal(agentView.values.secret, "[sensitive]", "agents remain redacted even with a sensitive-read delegation");

  await mail.purgeSubmission(owner, submission.id);
  const purged = await mail.getSubmission(owner, submission.id, { includeSensitive: true });
  assert.equal(purged.values, null);
  assert.equal(purged.submission.payloadState, "purged");
});

test("Mail Form validates notification headers before creating site-tree content", async () => {
  const { cms, custom, mail } = createMemoryServices();
  const boot = await cms.bootstrap({ workspaceName: "Header", siteName: "Header", hostname: "header.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const field = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "email", name: "Email", type: "email" });
  const table = await custom.createTable(owner, { workspaceId: boot.workspaceId, key: "header_form", name: "Header", kind: "content" });
  await custom.attachField(owner, { tableId: table.id, fieldId: field.id, required: true });
  await assert.rejects(
    mail.createMailForm(owner, { siteId: boot.siteId, parentId: null, slug: "header", title: "Header", tableId: table.id, recipientEmails: ["owner@example.com"], senderAddress: "noreply@example.com", subjectTemplate: "Valid\r\nBcc: attacker@example.com", turnstileRequired: false }),
    (error) => error instanceof DomainError && error.code === "MAIL_SUBJECT_INVALID",
  );
  assert.equal((await cms.listContentTree(owner, boot.siteId)).length, 0, "invalid configuration must not leave an orphan mail-form Content Item");
});

test("Mail Form requires published content and validates Turnstile through the injected verifier", async () => {
  const calls = [];
  const verifier = { async verify(input) { calls.push(input); return { success: input.token === "ok-token", hostname: "turnstile.test" }; } };
  const { cms, custom, mail } = createMemoryServices({ botVerifier: verifier });
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "turnstile.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const email = await custom.createField(owner, { workspaceId: boot.workspaceId, key: "email", name: "Email", type: "email" });
  const table = await custom.createTable(owner, { workspaceId: boot.workspaceId, key: "turnstile_form", name: "Form", kind: "content" });
  await custom.attachField(owner, { tableId: table.id, fieldId: email.id, required: true });
  const created = await mail.createMailForm(owner, { siteId: boot.siteId, parentId: null, slug: "form", title: "Form", tableId: table.id, recipientEmails: ["owner@example.com"], senderAddress: "noreply@example.com", turnstileRequired: true });
  await assert.rejects(mail.prepareConfirmation({ mailFormId: created.definition.id, values: { email: "a@example.com" }, turnstileToken: "ok-token" }), (error) => error instanceof DomainError && error.code === "MAIL_FORM_NOT_PUBLISHED");
  await publishContent(cms, owner, created.snapshot);
  await assert.rejects(mail.prepareConfirmation({ mailFormId: created.definition.id, values: { email: "a@example.com" }, turnstileToken: "bad", hostname: "turnstile.test" }), (error) => error instanceof DomainError && error.code === "TURNSTILE_VERIFICATION_FAILED");
  const confirmation = await mail.prepareConfirmation({ mailFormId: created.definition.id, values: { email: "a@example.com" }, turnstileToken: "ok-token", hostname: "turnstile.test" });
  assert.ok(confirmation.token.includes("."));
  assert.equal(calls.length, 2);
});

test("Turnstile-required forms fail closed when no verifier secret is configured", async () => {
  const { cms, custom, mail } = createMemoryServices();
  const { created } = await prepare({ cms, custom, mail, hostname: "missing-turnstile.test", turnstileRequired: true });
  await assert.rejects(
    mail.prepareConfirmation({ mailFormId: created.definition.id, values: { name: "A", email: "a@example.com", message: "hello", secret: "" }, turnstileToken: "unverified" }),
    (error) => error instanceof DomainError && error.code === "TURNSTILE_VERIFICATION_FAILED" && error.details?.errorCodes?.includes("turnstile-not-configured"),
  );
});

test("Turnstile verifier sends canonical Siteverify JSON and rejects hostname mismatch", async () => {
  let captured;
  const verifier = new TurnstileBotVerifier("secret", async (_url, init) => {
    captured = JSON.parse(init.body);
    return new Response(JSON.stringify({ success: true, hostname: "wrong.test", action: "contact" }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await verifier.verify({ token: "token", remoteIp: "192.0.2.3", idempotencyKey: "idempotency", expectedHostname: "right.test" });
  assert.equal(result.success, false);
  assert.deepEqual(result.errorCodes, ["hostname-mismatch"]);
  assert.deepEqual(captured, { secret: "secret", response: "token", idempotency_key: "idempotency", remoteip: "192.0.2.3" });
  const missingHostname = new TurnstileBotVerifier("secret", async () => new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } }));
  const missingResult = await missingHostname.verify({ token: "token", idempotencyKey: "id", expectedHostname: "right.test" });
  assert.equal(missingResult.success, false);
  assert.deepEqual(missingResult.errorCodes, ["hostname-mismatch"]);
});

class Statement { constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;} bind(...values){return new Statement(this.db,this.sql,values);} async first(){return this.db.prepare(this.sql).get(...this.values)??null;} async all(){return{results:this.db.prepare(this.sql).all(...this.values)};} async run(){return this.db.prepare(this.sql).run(...this.values);} }
class D1Shim { constructor(db){this.db=db;} prepare(sql){return new Statement(this.db,sql);} async batch(statements){this.db.exec("BEGIN");try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec("COMMIT");return results;}catch(error){this.db.exec("ROLLBACK");throw error;}} }
function migrate(db){const dir=new URL("../migrations/",import.meta.url);for(const file of readdirSync(dir).filter((n)=>n.endsWith(".sql")).sort())db.exec(readFileSync(new URL(file,dir),"utf8"));}

test("D1 Mail Form atomically consumes one confirmation and separates submission payload", async () => {
  const db=new DatabaseSync(":memory:");migrate(db);const shim=new D1Shim(db);
  const cms=new CmsService(new D1CmsStore(shim));const custom=new CustomContentService(new D1CustomContentStore(shim),cms);const sender=new MemoryMailSender();const mail=new MailFormService({store:new D1MailFormStore(shim),cms,customContent:custom,signingSecret:"d1-secret",sender});
  const {owner,created}=await prepare({cms,custom,mail,hostname:"d1-mail.test"});
  const confirmation=await mail.prepareConfirmation({mailFormId:created.definition.id,values:{name:"D1",email:"d1@example.com",message:"hello",secret:"s"}});
  const submission=await mail.submitConfirmation({confirmationId:confirmation.session.id,token:confirmation.token});
  assert.equal(db.prepare("SELECT count(*) count FROM mail_submissions").get().count,1);
  assert.equal(db.prepare("SELECT count(*) count FROM mail_submission_payloads").get().count,1);
  assert.equal(db.prepare("SELECT count(*) count FROM mail_notification_outbox").get().count,2);
  await assert.rejects(mail.submitConfirmation({confirmationId:confirmation.session.id,token:confirmation.token}), (error)=>error instanceof DomainError&&error.code==="MAIL_CONFIRMATION_USED");
  await mail.deliverPending(owner);
  assert.equal(db.prepare("SELECT state FROM mail_submissions WHERE id=?").get(submission.id).state,"notified");
});

test("Public renderer provides input, confirmation, one-time submit, and no-store responses", async () => {
  const {cms,custom,mail}=createMemoryServices();const {boot,created}=await prepare({cms,custom,mail,hostname:"public-mail.test"});
  const worker=createPublicWorker(()=>cms,{resolveCustomContent:()=>custom,resolveMailForms:()=>mail});
  const env={SITE_ID:boot.siteId};
  const get=await worker.fetch(new Request("https://public-mail.test/contact"),env);assert.equal(get.status,200);assert.match(await get.text(),/入力内容を確認する/);assert.equal(get.headers.get("cache-control"),"private, no-store");
  const confirmBody=new URLSearchParams({name:"田中",email:"tanaka@example.com",message:"こんにちは",secret:"",website:""});
  const confirm=await worker.fetch(new Request("https://public-mail.test/contact/confirm",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:confirmBody}),env);assert.equal(confirm.status,200);const confirmHtml=await confirm.text();assert.match(confirmHtml,/入力内容の確認/);
  const id=confirmHtml.match(/name="confirmationId" value="([^"]+)"/)?.[1];const token=confirmHtml.match(/name="token" value="([^"]+)"/)?.[1];assert.ok(id&&token);
  const submitBody=new URLSearchParams({confirmationId:id,token});const submitted=await worker.fetch(new Request("https://public-mail.test/contact/submit",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:submitBody}),env);assert.equal(submitted.status,201);assert.match(await submitted.text(),/お問い合わせを受け付けました/);
  const replay=await worker.fetch(new Request("https://public-mail.test/contact/submit",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:submitBody}),env);assert.equal(replay.status,409);
  const wrongType=await worker.fetch(new Request("https://public-mail.test/contact/confirm",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}),env);assert.equal(wrongType.status,415);
  const oversized=await worker.fetch(new Request("https://public-mail.test/contact/confirm",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:`email=a%40example.com&message=${"x".repeat(262145)}`}),env);assert.equal(oversized.status,413);
});
