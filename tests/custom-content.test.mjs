import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import {
  asCustomEntryApprovalId,
  DomainError,
} from "@baser-edge/core-types";
import { Capabilities } from "@baser-edge/authorization";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { CustomContentService, MemoryCustomContentStore } from "@baser-edge/custom-content-kernel";
import { D1CmsStore, D1CustomContentStore } from "@baser-edge/cloudflare-adapters";
import { createPublicWorker } from "@baser-edge/public-renderer";

function headingDocument(text) {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text }));
  return document;
}

async function publishContent(cms, owner, snapshot) {
  const approval = await cms.requestApproval(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  return cms.publish(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id, approvalId: approval.id });
}

async function prepare(service, cms, owner, boot) {
  const name = await service.createField(owner, { workspaceId: boot.workspaceId, key: "name", name: "名称", type: "text" });
  const price = await service.createField(owner, { workspaceId: boot.workspaceId, key: "price", name: "価格", type: "integer" });
  const description = await service.createField(owner, { workspaceId: boot.workspaceId, key: "description", name: "説明", type: "richtext" });
  const table = await service.createTable(owner, { workspaceId: boot.workspaceId, key: "products", name: "商品", kind: "content", displayFieldKey: "name" });
  await service.attachField(owner, { tableId: table.id, fieldId: name.id, required: true, searchable: true, unique: true, sortOrder: 10 });
  await service.attachField(owner, { tableId: table.id, fieldId: price.id, required: true, sortOrder: 20 });
  await service.attachField(owner, { tableId: table.id, fieldId: description.id, searchable: true, sortOrder: 30 });
  const configured = await service.createCustomContent(owner, { siteId: boot.siteId, parentId: null, slug: "products", title: "商品一覧", tableId: table.id, document: headingDocument("商品一覧"), listOrderFieldKey: "price", listDirection: "asc" });
  await publishContent(cms, owner, configured.snapshot);
  return { table, configured };
}

test("Custom Content defines fields and tables, validates entries, and publishes only approved immutable revisions", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const custom = new CustomContentService(new MemoryCustomContentStore(), cms);
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "custom.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const { table, configured } = await prepare(custom, cms, owner, boot);
  assert.equal(table.schemaVersion, 1);
  assert.equal((await custom.getTableSchema(table.id)).table.schemaVersion, 4);

  await assert.rejects(custom.createEntry(owner, { customContentId: configured.definition.id, slug: "100", values: { name: "数字", price: 100, description: headingDocument("説明") } }), (error) => error instanceof DomainError && error.code === "CUSTOM_ENTRY_NUMERIC_SLUG");
  await assert.rejects(custom.createEntry(owner, { customContentId: configured.definition.id, slug: "missing", values: { name: "不足" } }), (error) => error instanceof DomainError && error.code === "CUSTOM_ENTRY_REQUIRED_FIELD");

  const entry = await custom.createEntry(owner, { customContentId: configured.definition.id, slug: "alpha", values: { name: "アルファ", price: 1200, description: headingDocument("最初の説明") } });
  const approval = await custom.requestApproval(owner, { entryId: entry.entry.id, revisionId: entry.workingRevision.id });
  await custom.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  const published = await custom.publishEntry(owner, { entryId: entry.entry.id, revisionId: entry.workingRevision.id, approvalId: approval.id });
  assert.equal(published.publishedRevision.values.name, "アルファ");
  assert.equal((await custom.listPublished(configured.definition.id, { query: "アル" })).total, 1);
  assert.equal((await custom.getPublishedByKey(configured.definition.id, "alpha")).entry.id, entry.entry.id);

  await assert.rejects(custom.createEntry(owner, { customContentId: configured.definition.id, slug: "duplicate", values: { name: "アルファ", price: 2000, description: headingDocument("重複") } }), (error) => error instanceof DomainError && error.code === "CUSTOM_ENTRY_UNIQUE_FIELD");

  const revised = await custom.reviseEntry(owner, { entryId: entry.entry.id, baseRevisionId: entry.workingRevision.id, expectedLockVersion: entry.entry.lockVersion, values: { name: "アルファ改", price: 1300, description: headingDocument("改訂") }, changeSummary: "価格と名称を更新" });
  await assert.rejects(custom.reviseEntry(owner, { entryId: entry.entry.id, baseRevisionId: entry.workingRevision.id, expectedLockVersion: entry.entry.lockVersion, values: { name: "古い更新", price: 999, description: headingDocument("古い") }, changeSummary: "stale" }), (error) => error instanceof DomainError && error.code === "CUSTOM_ENTRY_REVISION_CONFLICT");
  assert.equal(revised.revisionNumber, 2);
  assert.equal((await custom.getPublishedByKey(configured.definition.id, "alpha")).publishedRevision.values.name, "アルファ");
});

test("unpublish removes public custom entry but keeps working revision", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const custom = new CustomContentService(new MemoryCustomContentStore(), cms);
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "unpub-custom.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const { configured } = await prepare(custom, cms, owner, boot);
  const entry = await custom.createEntry(owner, { customContentId: configured.definition.id, slug: "to-unpub", values: { name: "公開後取り下げ", price: 100, description: headingDocument("x") } });
  const approval = await custom.requestApproval(owner, { entryId: entry.entry.id, revisionId: entry.workingRevision.id });
  await custom.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await custom.publishEntry(owner, { entryId: entry.entry.id, revisionId: entry.workingRevision.id, approvalId: approval.id });
  assert.ok((await custom.getPublishedByKey(configured.definition.id, "to-unpub"))?.publishedRevision);
  const unpublished = await custom.unpublishEntry(owner, { entryId: entry.entry.id });
  assert.equal(unpublished.publishedRevision, null);
  assert.ok(unpublished.workingRevision);
  assert.equal(await custom.getPublishedByKey(configured.definition.id, "to-unpub"), null);
  const agent = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Agent" });
  await cms.grantCapability(owner, { principalId: agent.id, capability: Capabilities.CustomEntryUnpublish, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  const delegation = await cms.createDelegation(owner, { humanPrincipalId: boot.ownerPrincipalId, agentPrincipalId: agent.id, capabilities: [Capabilities.CustomEntryUnpublish], scope: { workspaceId: boot.workspaceId, siteId: boot.siteId }, maximumRisk: "high", expiresAt: Date.now() + 60_000 });
  const agentActor = actor(agent.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });
  await assert.rejects(custom.unpublishEntry(agentActor, { entryId: entry.entry.id }), (error) => error instanceof DomainError && error.code === "FORBIDDEN");
});

test("Agents can propose Custom Entry publication but cannot publish directly", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const custom = new CustomContentService(new MemoryCustomContentStore(), cms);
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "agent-custom.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const { configured } = await prepare(custom, cms, owner, boot);
  const agent = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Agent" });
  const capabilities = [Capabilities.CustomEntryRead, Capabilities.CustomEntryCreate, Capabilities.CustomEntryRequestPublish, Capabilities.CustomEntryPublish];
  for (const capability of capabilities) await cms.grantCapability(owner, { principalId: agent.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  const delegation = await cms.createDelegation(owner, { humanPrincipalId: boot.ownerPrincipalId, agentPrincipalId: agent.id, capabilities, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId }, maximumRisk: "high", expiresAt: Date.now() + 60_000 });
  const agentActor = actor(agent.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });
  const entry = await custom.createEntry(agentActor, { customContentId: configured.definition.id, slug: "agent-entry", values: { name: "AI商品", price: 500, description: headingDocument("AI") } });
  const approval = await custom.requestApproval(agentActor, { entryId: entry.entry.id, revisionId: entry.workingRevision.id });
  await custom.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await assert.rejects(custom.publishEntry(agentActor, { entryId: entry.entry.id, revisionId: entry.workingRevision.id, approvalId: approval.id }), (error) => error instanceof DomainError && error.code === "FORBIDDEN");
  assert.equal((await custom.publishEntry(owner, { entryId: entry.entry.id, revisionId: entry.workingRevision.id, approvalId: approval.id })).publishedRevision.values.name, "AI商品");
});

class Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return this.db.prepare(this.sql).run(...this.values); }
}
class D1Shim {
  constructor(db) { this.db = db; }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(statements) { this.db.exec("BEGIN"); try { const results=[]; for (const statement of statements) results.push(await statement.run()); this.db.exec("COMMIT"); return results; } catch (error) { this.db.exec("ROLLBACK"); throw error; } }
}
function migrate(db) { const dir = new URL("../migrations/", import.meta.url); for (const file of readdirSync(dir).filter((name)=>name.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file,dir),"utf8")); }

test("D1 Custom Content persists schema, typed projections, revisions and approvals", async () => {
  const db = new DatabaseSync(":memory:"); migrate(db); const shim = new D1Shim(db);
  const cms = new CmsService(new D1CmsStore(shim)); const custom = new CustomContentService(new D1CustomContentStore(shim), cms);
  const boot = await cms.bootstrap({ workspaceName:"W",siteName:"S",hostname:"d1-custom.test",ownerName:"Owner" }); const owner=actor(boot.ownerPrincipalId,"human");
  const { configured } = await prepare(custom,cms,owner,boot);
  const entry = await custom.createEntry(owner,{customContentId:configured.definition.id,slug:"d1-item",values:{name:"D1商品",price:800,description:headingDocument("D1")}});
  const approval=await custom.requestApproval(owner,{entryId:entry.entry.id,revisionId:entry.workingRevision.id}); await custom.decideApproval(owner,{approvalId:approval.id,decision:"approved"}); await custom.publishEntry(owner,{entryId:entry.entry.id,revisionId:entry.workingRevision.id,approvalId:approval.id});
  assert.equal(db.prepare("SELECT count(*) AS count FROM custom_entry_values WHERE revision_id=?").get(entry.workingRevision.id).count,3);
  assert.equal((await custom.listPublished(configured.definition.id)).items[0].publishedRevision.values.price,800);
  db.close();
});

test("Public renderer serves Custom Content list and detail pages", async () => {
  const cms = new CmsService(new MemoryCmsStore()); const store = new MemoryCustomContentStore(); const custom = new CustomContentService(store,cms);
  const boot=await cms.bootstrap({workspaceName:"W",siteName:"S",hostname:"render-custom.test",ownerName:"Owner"}); const owner=actor(boot.ownerPrincipalId,"human");
  const { configured }=await prepare(custom,cms,owner,boot); const entry=await custom.createEntry(owner,{customContentId:configured.definition.id,slug:"visible",values:{name:"公開商品",price:300,description:headingDocument("公開説明")}}); const approval=await custom.requestApproval(owner,{entryId:entry.entry.id,revisionId:entry.workingRevision.id});await custom.decideApproval(owner,{approvalId:approval.id,decision:"approved"});await custom.publishEntry(owner,{entryId:entry.entry.id,revisionId:entry.workingRevision.id,approvalId:approval.id});
  const worker=createPublicWorker(()=>cms,{resolveCustomContent:()=>custom});
  const list=await worker.fetch(new Request("https://render-custom.test/products"),{SITE_ID:boot.siteId}); assert.equal(list.status,200); assert.match(await list.text(),/公開商品/);
  const detail=await worker.fetch(new Request("https://render-custom.test/products/view/visible"),{SITE_ID:boot.siteId}); assert.equal(detail.status,200); assert.match(await detail.text(),/公開説明/);
});
