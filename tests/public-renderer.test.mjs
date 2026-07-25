import test from "node:test";
import assert from "node:assert/strict";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";

import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";

test("Public Renderer shows published admin banner when baserAdminView=published", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "Site",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Live" }));
  document.root.slots.body.push(createBlock("richText", { paragraphs: ["本文"] }));
  const page = await cms.createPage(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "live",
    title: "Live",
    document,
  });
  const approval = await cms.requestApproval(owner, {
    contentItemId: page.item.id,
    revisionId: page.workingRevision.id,
  });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, {
    contentItemId: page.item.id,
    revisionId: page.workingRevision.id,
    approvalId: approval.id,
  });

  const worker = createPublicWorker(() => cms);
  const plain = await worker.fetch(new Request(`https://renderer.test/live?siteId=${boot.siteId}`), {
    SITE_ID: boot.siteId,
  });
  const plainHtml = await plain.text();
  assert.equal(plain.status, 200);
  assert.doesNotMatch(plainHtml, /公開済みページ/);

  const admin = await worker.fetch(
    new Request(`https://renderer.test/live?siteId=${boot.siteId}&baserAdminView=published`),
    { SITE_ID: boot.siteId },
  );
  const adminHtml = await admin.text();
  assert.equal(admin.status, 200);
  assert.match(adminHtml, /公開済みページ/);
  assert.match(adminHtml, /【公開】/);
});

test("Public Renderer returns an HTTP redirect for a moved baser content path", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "Site",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const folder = await cms.createFolder(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "before",
    title: "Before",
  });
  await cms.relocateContent(owner, {
    contentItemId: folder.item.id,
    targetParentId: null,
    newSlug: "after",
    expectedTreeVersion: folder.node.treeVersion,
  });

  const worker = createPublicWorker(() => cms);
  const response = await worker.fetch(new Request("https://renderer.test/before"), {
    SITE_ID: boot.siteId,
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "/after");
  assert.equal(response.headers.get("cache-control"), "public, max-age=300");
});
