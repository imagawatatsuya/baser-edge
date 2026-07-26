import test from "node:test";
import assert from "node:assert/strict";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";

import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";

test("Public Renderer shows an initialized-site page instead of 404 for an empty root", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "空のサイト",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const worker = createPublicWorker(() => cms);
  const response = await worker.fetch(new Request("https://renderer.test/"), {
    SITE_ID: boot.siteId,
  });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(html, /空のサイト/);
  assert.match(html, /サイトの開設が完了しました/);
});

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
  const plain = await worker.fetch(new Request("https://renderer.test/live"), {
    SITE_ID: boot.siteId,
  });
  const plainHtml = await plain.text();
  assert.equal(plain.status, 200);
  assert.doesNotMatch(plainHtml, /公開済みページ/);

  const admin = await worker.fetch(
    new Request("https://renderer.test/live?baserAdminView=published"),
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

test("Public Renderer redirects the site root to a published initial home page", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "Site",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Site" }));
  const page = await cms.createPage(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "home",
    title: "ホーム",
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
  const response = await worker.fetch(new Request("https://renderer.test/"), {
    SITE_ID: boot.siteId,
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/home");
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
});
