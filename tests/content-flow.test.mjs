import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@baser-edge/core-types";
import { Capabilities } from "@baser-edge/authorization";
import {
  CmsService,
  MemoryCmsStore,
  actor,
} from "@baser-edge/content-kernel";
import {
  createBlock,
  createEmptyDocument,
} from "@baser-edge/structured-document";
import { AgentOperations } from "@baser-edge/agent-tools";
import { renderPage } from "@baser-edge/renderer";

async function fixture() {
  let time = 1_750_000_000_000;
  const clock = { now: () => ++time };
  const store = new MemoryCmsStore();
  const cms = new CmsService(store, { clock });
  const boot = await cms.bootstrap({ workspaceName: "移植プロジェクト", siteName: "公式サイト", hostname: "example.test", ownerName: "所有者" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const agentPrincipal = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "編集AI" });
  for (const capability of [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish]) {
    await cms.grantCapability(owner, { principalId: agentPrincipal.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  }
  const delegation = await cms.createDelegation(owner, {
    humanPrincipalId: boot.ownerPrincipalId,
    agentPrincipalId: agentPrincipal.id,
    capabilities: [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish],
    scope: { workspaceId: boot.workspaceId, siteId: boot.siteId },
    maximumRisk: "medium",
    expiresAt: time + 86_400_000,
  });
  const agentActor = actor(agentPrincipal.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });
  return { store, cms, boot, owner, agentActor };
}

test("AI proposal requires human approval and cannot publish directly", async () => {
  const { store, cms, boot, owner, agentActor } = await fixture();
  const document = createEmptyDocument();
  const heading = createBlock("heading", { level: 1, text: "旧タイトル" });
  const body = createBlock("richText", { paragraphs: ["安全な本文"] });
  document.root.slots.body.push(heading, body);
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "about", title: "会社案内", document });

  const tools = new AgentOperations(cms);
  const proposal = await tools.proposeDocumentChange(agentActor, {
    contentItemId: page.item.id,
    baseRevisionId: page.workingRevision.id,
    expectedLockVersion: page.item.lockVersion,
    operations: [{ kind: "updateProps", blockId: heading.id, patch: { text: "AIが提案したタイトル" } }],
    instructionSummary: "見出しを明確にする",
    modelProvider: "test",
    modelName: "deterministic",
  });
  const approval = await tools.requestPublication(agentActor, {
    contentItemId: page.item.id,
    revisionId: proposal.revision.id,
    riskLevel: proposal.changeSet.riskLevel,
  });
  const approved = await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved", comment: "確認済み" });
  assert.equal(approved.revisionHash, proposal.revision.contentHash);

  await assert.rejects(
    cms.publish(agentActor, { contentItemId: page.item.id, revisionId: proposal.revision.id, approvalId: approval.id }),
    (error) => error instanceof DomainError && error.code === "FORBIDDEN",
  );

  const published = await cms.publish(owner, { contentItemId: page.item.id, revisionId: proposal.revision.id, approvalId: approval.id });
  assert.equal(published.item.publishedRevisionId, proposal.revision.id);
  const publicPage = await cms.findPublicByPath(boot.siteId, "/about");
  assert.equal(publicPage?.publishedRevision?.document.root.slots.body[0].props.text, "AIが提案したタイトル");
  assert.equal((await store.listOutbox()).length, 1);

  const audit = await cms.listAudit(owner, boot.workspaceId);
  assert.ok(audit.some((event) => event.result === "denied" && event.action === "content.publish"));
  assert.ok(audit.some((event) => event.result === "success" && event.action === "content.publish"));
});

test("unpublish removes public view but keeps working revision", async () => {
  const { cms, boot, owner, agentActor } = await fixture();
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "公開テスト" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "live-then-off", title: "公開テスト", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
  assert.ok(await cms.findPublicByPath(boot.siteId, "/live-then-off"));

  const unpublished = await cms.unpublish(owner, { contentItemId: page.item.id });
  assert.equal(unpublished.item.publishedRevisionId, null);
  assert.ok(unpublished.workingRevision);
  assert.equal(await cms.findPublicByPath(boot.siteId, "/live-then-off"), null);

  await assert.rejects(
    cms.unpublish(agentActor, { contentItemId: page.item.id }),
    (error) => error instanceof DomainError && error.code === "FORBIDDEN",
  );
  await assert.rejects(
    cms.unpublish(owner, { contentItemId: page.item.id }),
    (error) => error instanceof DomainError && error.code === "CONTENT_NOT_PUBLISHED",
  );
});

test("revision conflicts are detected instead of overwriting", async () => {
  const { cms, boot, owner } = await fixture();
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 2, text: "A" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "conflict", title: "競合", document });
  const first = await cms.commitRevision(owner, {
    contentItemId: page.item.id,
    baseRevisionId: page.workingRevision.id,
    expectedLockVersion: page.item.lockVersion,
    fields: { title: "競合" },
    document,
    changeSummary: "first",
  });
  await assert.rejects(
    cms.commitRevision(owner, {
      contentItemId: page.item.id,
      baseRevisionId: page.workingRevision.id,
      expectedLockVersion: page.item.lockVersion,
      fields: { title: "stale" },
      document,
      changeSummary: "stale",
    }),
    (error) => error instanceof DomainError && error.code === "REVISION_CONFLICT",
  );
  assert.equal((await cms.getContent(owner, page.item.id)).item.workingRevisionId, first.id);
});

test("tree move reports descendant impact and resolves old paths to the latest route", async () => {
  const { store, cms, boot, owner } = await fixture();
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "old", title: "移動元" });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 2, text: "移動" }));
  await cms.createPage(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "child", title: "子", document });
  const impact = await cms.analyzeRelocation(owner, { contentItemId: folder.item.id, targetParentId: null, newSlug: "new" });
  assert.equal(impact.affected.length, 2);
  assert.equal(impact.riskLevel, "high");
  const moved = await cms.relocateContent(owner, { contentItemId: folder.item.id, targetParentId: null, newSlug: "new", expectedTreeVersion: folder.node.treeVersion });
  assert.equal(moved.route.path, "/new");
  const redirect = await cms.resolvePublicPath(boot.siteId, "/old");
  assert.deepEqual(redirect, { kind: "redirect", location: "/new", statusCode: 301 });
  const movedBack = await cms.relocateContent(owner, { contentItemId: folder.item.id, targetParentId: null, newSlug: "old", expectedTreeVersion: moved.node.treeVersion });
  assert.equal(movedBack.route.path, "/old");
  const latestRedirect = await cms.resolvePublicPath(boot.siteId, "/new");
  assert.deepEqual(latestRedirect, { kind: "redirect", location: "/old", statusCode: 301 });
  assert.ok([...store.redirects.values()].some((entry) => entry.sourcePath === "/new" && entry.active));
});

test("renderer escapes content instead of emitting arbitrary HTML", async () => {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 2, text: "<script>alert(1)</script>" }));
  const html = renderPage(document, undefined, { title: "安全" });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
});
