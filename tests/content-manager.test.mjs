import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";

async function fixture() {
  const store = new MemoryCmsStore();
  const cms = new CmsService(store);
  const boot = await cms.bootstrap({ workspaceName: "W", siteName: "S", hostname: "example.test", ownerName: "Owner" });
  return { store, cms, boot, owner: actor(boot.ownerPrincipalId, "human") };
}

async function publishPage(cms, owner, page) {
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  return cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
}

function pageDocument(text = "本文") {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text }));
  return document;
}

test("content tree reorder changes sibling order by sortKey", async () => {
  const { cms, boot, owner } = await fixture();
  const a = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "aaa", title: "A", document: pageDocument("A") });
  const b = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "bbb", title: "B", document: pageDocument("B") });
  await cms.reorderContent(owner, {
    contentItemId: b.item.id,
    targetParentId: null,
    insertAfterContentItemId: null,
    expectedTreeVersion: b.node.treeVersion,
  });
  const tree = await cms.listContentTree(owner, boot.siteId);
  const root = tree
    .filter((e) => e.snapshot.node.parentId === null)
    .sort((x, y) => x.snapshot.node.sortKey.localeCompare(y.snapshot.node.sortKey, undefined, { numeric: true }));
  assert.equal(root[0]?.snapshot.item.id, b.item.id);
  assert.equal(root[1]?.snapshot.item.id, a.item.id);
});

test("only folders can contain child content", async () => {
  const { cms, boot, owner } = await fixture();
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "company", title: "会社" });
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "about", title: "会社案内", document: pageDocument() });
  assert.equal(page.route.path, "/company/about");

  await assert.rejects(
    cms.createPage(owner, { siteId: boot.siteId, parentId: page.node.id, slug: "child", title: "子", document: pageDocument() }),
    (error) => error instanceof DomainError && error.code === "PARENT_MUST_BE_FOLDER",
  );
});

test("alias exposes the published target at another tree path", async () => {
  const { cms, boot, owner } = await fixture();
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "about", title: "会社案内", document: pageDocument("公開本文") });
  await publishPage(cms, owner, page);
  const alias = await cms.createAlias(owner, { siteId: boot.siteId, parentId: null, slug: "company", title: "会社への別名", targetContentItemId: page.item.id });
  assert.equal(alias.item.contentTypeKey, "alias");
  const resolved = await cms.findPublicByPath(boot.siteId, "/company");
  assert.equal(resolved?.item.id, page.item.id);
  assert.equal(resolved?.publishedRevision?.document.root.slots.body[0].props.text, "公開本文");
});

test("recursive folder copy keeps hierarchy and produces unpublished independent content", async () => {
  const { cms, boot, owner } = await fixture();
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "service", title: "サービス" });
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "consulting", title: "相談", document: pageDocument() });
  const copied = await cms.copyContent(owner, { contentItemId: folder.item.id, targetParentId: null, newSlug: "service-copy", expectedTreeVersion: folder.node.treeVersion });
  assert.equal(copied.copiedContentIds.length, 2);
  assert.equal(copied.root.route.path, "/service-copy");
  const tree = await cms.listContentTree(owner, boot.siteId);
  assert.ok(tree.some((entry) => entry.snapshot.node.cachedPath === "/service-copy/consulting"));
  const copiedChild = tree.find((entry) => entry.snapshot.node.cachedPath === "/service-copy/consulting");
  assert.notEqual(copiedChild?.snapshot.item.id, page.item.id);
  assert.equal(copiedChild?.snapshot.item.publishedRevisionId, null);
});

test("trashing a folder affects its subtree, frees the route, and restores safely", async () => {
  const { cms, boot, owner } = await fixture();
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "archive", title: "保管" });
  await cms.createPage(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "entry", title: "項目", document: pageDocument() });
  const trashed = await cms.trashContent(owner, { contentItemId: folder.item.id, expectedTreeVersion: folder.node.treeVersion });
  assert.equal(trashed.affectedContentIds.length, 2);
  assert.equal((await cms.listTrash(owner, boot.siteId)).length, 2);
  assert.equal((await cms.listContentTree(owner, boot.siteId)).length, 0);

  await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "archive", title: "新しい保管" });
  const trashedRoot = await cms.getContent(owner, folder.item.id);
  await assert.rejects(
    cms.restoreContent(owner, { contentItemId: folder.item.id, expectedTreeVersion: trashedRoot.node.treeVersion }),
    (error) => error instanceof DomainError && (error.code === "ROUTE_COLLISION" || error.code === "DATABASE_CONSTRAINT"),
  );
  const restored = await cms.restoreContent(owner, { contentItemId: folder.item.id, newSlug: "archive-restored", expectedTreeVersion: trashedRoot.node.treeVersion });
  assert.equal(restored.route.path, "/archive-restored");
  assert.ok((await cms.listContentTree(owner, boot.siteId)).some((entry) => entry.snapshot.node.cachedPath === "/archive-restored/entry"));
  assert.equal((await cms.listTrash(owner, boot.siteId)).length, 0);
});
