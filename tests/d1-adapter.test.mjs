import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Capabilities } from "@baser-edge/authorization";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, actor } from "@baser-edge/content-kernel";
import { D1AssetMetadataStore, D1CmsStore, D1PreviewStore } from "@baser-edge/cloudflare-adapters";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { AgentOperations } from "@baser-edge/agent-tools";
import { AssetService, MemoryAssetObjectStore } from "@baser-edge/asset-kernel";
import { PreviewService } from "@baser-edge/preview-kernel";

class Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return this.db.prepare(this.sql).run(...this.values); }
}
function migrate(db) {
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
}

class D1Shim {
  constructor(db) { this.db = db; }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

test("D1 adapter executes the same approval-first publication flow", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const store = new D1CmsStore(new D1Shim(db));
  const cms = new CmsService(store);
  const boot = await cms.bootstrap({ workspaceName: "D1", siteName: "D1 Site", hostname: "d1.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const agent = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Agent" });
  for (const capability of [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish]) {
    await cms.grantCapability(owner, { principalId: agent.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  }
  const delegation = await cms.createDelegation(owner, {
    humanPrincipalId: boot.ownerPrincipalId,
    agentPrincipalId: agent.id,
    capabilities: [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish],
    scope: { workspaceId: boot.workspaceId, siteId: boot.siteId },
    expiresAt: Date.now() + 60_000,
  });
  const agentActor = actor(agent.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });
  const document = createEmptyDocument();
  const heading = createBlock("heading", { level: 1, text: "Before" });
  document.root.slots.body.push(heading);
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "d1", title: "D1", document });
  const proposal = await new AgentOperations(cms).proposeDocumentChange(agentActor, {
    contentItemId: page.item.id,
    baseRevisionId: page.workingRevision.id,
    expectedLockVersion: page.item.lockVersion,
    operations: [{ kind: "updateProps", blockId: heading.id, patch: { text: "After" } }],
    instructionSummary: "change",
    modelProvider: "test",
    modelName: "test",
  });
  const approval = await cms.requestApproval(agentActor, { contentItemId: page.item.id, revisionId: proposal.revision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  const published = await cms.publish(owner, { contentItemId: page.item.id, revisionId: proposal.revision.id, approvalId: approval.id });
  assert.equal(published.publishedRevision.document.root.slots.body[0].props.text, "After");
  assert.equal((await store.listOutbox()).length, 1);
  db.close();
});

test("D1 listContentTree omits revision document bodies", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const cms = new CmsService(new D1CmsStore(new D1Shim(db)));
  const boot = await cms.bootstrap({ workspaceName: "Tree", siteName: "Tree", hostname: "tree-list.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Unique body marker" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "tree-page", title: "Tree page", document });
  const full = await cms.getContent(owner, page.item.id);
  const listed = (await cms.listContentTree(owner, boot.siteId)).find((entry) => entry.snapshot.item.id === page.item.id);
  assert.ok(listed);
  assert.equal(listed.snapshot.workingRevision?.fields.title, "Tree page");
  assert.deepEqual(listed.snapshot.workingRevision?.document, createEmptyDocument());
  assert.notDeepEqual(full.workingRevision?.document, createEmptyDocument());
  db.close();
});

test("D1 listTrash omits revision document bodies", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const cms = new CmsService(new D1CmsStore(new D1Shim(db)));
  const boot = await cms.bootstrap({ workspaceName: "Trash", siteName: "Trash", hostname: "trash-list.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Trash body marker" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "trash-page", title: "Trash page", document });
  await cms.trashContent(owner, { contentItemId: page.item.id, expectedTreeVersion: page.node.treeVersion });
  const full = await cms.getContent(owner, page.item.id);
  const listed = (await cms.listTrash(owner, boot.siteId)).find((entry) => entry.snapshot.item.id === page.item.id);
  assert.ok(listed);
  assert.equal(listed.snapshot.workingRevision?.fields.title, "Trash page");
  assert.deepEqual(listed.snapshot.workingRevision?.document, createEmptyDocument());
  assert.notDeepEqual(full.workingRevision?.document, createEmptyDocument());
  db.close();
});


test("D1 trigger rejects stale revisions with a domain conflict", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const cms = new CmsService(new D1CmsStore(new D1Shim(db)));
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "conflict.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "A" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "conflict", title: "C", document });
  await cms.commitRevision(owner, { contentItemId: page.item.id, baseRevisionId: page.workingRevision.id, expectedLockVersion: page.item.lockVersion, fields: { title: "C" }, document, changeSummary: "first" });
  await assert.rejects(cms.commitRevision(owner, { contentItemId: page.item.id, baseRevisionId: page.workingRevision.id, expectedLockVersion: page.item.lockVersion, fields: { title: "C" }, document, changeSummary: "stale" }), (error) => error instanceof DomainError && error.code === "REVISION_CONFLICT");
  db.close();
});

test("D1 content manager supports folder, alias, recursive copy, trash and restore", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const store = new D1CmsStore(new D1Shim(db));
  const cms = new CmsService(store);
  const boot = await cms.bootstrap({ workspaceName: "CM", siteName: "CM Site", hostname: "cm.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "company", title: "会社" });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "会社案内" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "about", title: "会社案内", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
  await cms.createAlias(owner, { siteId: boot.siteId, parentId: null, slug: "profile", title: "別名", targetContentItemId: page.item.id });
  assert.equal((await cms.findPublicByPath(boot.siteId, "/profile"))?.item.id, page.item.id);

  const copied = await cms.copyContent(owner, { contentItemId: folder.item.id, targetParentId: null, newSlug: "company-copy", expectedTreeVersion: folder.node.treeVersion });
  assert.equal(copied.copiedContentIds.length, 2);
  assert.ok((await cms.listContentTree(owner, boot.siteId)).some((entry) => entry.snapshot.node.cachedPath === "/company-copy/about"));

  await cms.trashContent(owner, { contentItemId: folder.item.id, expectedTreeVersion: folder.node.treeVersion });
  const trashedRoot = await cms.getContent(owner, folder.item.id);
  assert.equal((await cms.listTrash(owner, boot.siteId)).filter((entry) => entry.trash?.rootContentItemId === folder.item.id).length, 2);
  const restored = await cms.restoreContent(owner, { contentItemId: folder.item.id, newSlug: "company-restored", expectedTreeVersion: trashedRoot.node.treeVersion });
  assert.equal(restored.route.path, "/company-restored");
  assert.ok((await cms.listContentTree(owner, boot.siteId)).some((entry) => entry.snapshot.node.cachedPath === "/company-restored/about"));
  db.close();
});


test("D1 persists signed assets, published references and revocable preview sessions", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const shim = new D1Shim(db);
  const store = new D1CmsStore(shim);
  const cms = new CmsService(store);
  const boot = await cms.bootstrap({ workspaceName: "Media", siteName: "Media Site", hostname: "media.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const gateway = {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms),
  };
  const assets = new AssetService({
    metadata: new D1AssetMetadataStore(shim),
    objects: new MemoryAssetObjectStore(),
    security: gateway,
    signingSecret: "d1-asset-secret-for-tests",
    usageInspector: { listPublishedReferences: store.listPublishedAssetReferences.bind(store) },
  });
  const created = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "d1.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(created.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({ sessionId: created.session.id, token, mediaType: "image/png", body: new Uint8Array([1, 2, 3]) });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("image", { assetId: ready.id, alt: "D1" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "media", title: "Media", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
  const references = await store.listPublishedAssetReferences(ready.id);
  assert.equal(references.length, 1);
  assert.equal(references[0].path, "/media");
  await assert.rejects(assets.deleteAsset(owner, ready.id), (error) => error instanceof DomainError && error.code === "ASSET_IN_USE");

  const previews = new PreviewService({ store: new D1PreviewStore(shim), cms, security: gateway, signingSecret: "d1-preview-secret-tests" });
  const preview = await previews.create(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, previewBaseUrl: "https://preview.test" });
  const previewToken = decodeURIComponent(new URL(preview.previewUrl).pathname.replace("/_preview/", ""));
  assert.equal((await previews.resolve(previewToken)).revision.id, page.workingRevision.id);
  assert.equal(db.prepare("SELECT count(*) AS count FROM preview_sessions").get().count, 1);
  await previews.revoke(owner, preview.session.id);
  await assert.rejects(previews.resolve(previewToken), (error) => error instanceof DomainError && error.code === "PREVIEW_REVOKED");
  db.close();
});
