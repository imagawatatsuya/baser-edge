import test from "node:test";
import assert from "node:assert/strict";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { MemoryThemeStore, ThemeService } from "@baser-edge/theme-kernel";

import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";

function memoryResponseCache() {
  const entries = new Map();
  return {
    async match(request) {
      return entries.get(request.url)?.clone();
    },
    async put(request, response) {
      entries.set(request.url, response.clone());
    },
  };
}

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

test("Public Renderer caches public GET responses, bypasses admin views, and uses a D1 read session", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "Cache Site",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const page = await cms.createPage(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "cached",
    title: "Cached",
    document: createEmptyDocument(),
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

  const session = { prepare() {}, batch() {} };
  let sessionCalls = 0;
  let resolverCalls = 0;
  const db = {
    prepare() {},
    batch() {},
    withSession(constraint) {
      assert.equal(constraint, "first-unconstrained");
      sessionCalls += 1;
      return session;
    },
  };
  const worker = createPublicWorker(
    (env) => {
      resolverCalls += 1;
      assert.equal(env.DB, session);
      return cms;
    },
    {
      cache: memoryResponseCache(),
      resolveThemes: () => new ThemeService({
        store: new MemoryThemeStore(),
        cms,
        security: { authorize: async () => {}, success: async () => {} },
      }),
    },
  );
  const env = { SITE_ID: boot.siteId, DB: db };
  const request = new Request("https://renderer.test/cached");
  const first = await worker.fetch(request, env);
  assert.equal(first.headers.get("x-baser-edge-cache"), "MISS");
  const second = await worker.fetch(request, env);
  assert.equal(second.headers.get("x-baser-edge-cache"), "HIT");
  assert.equal(sessionCalls, 1);
  assert.equal(resolverCalls, 1);

  const admin = await worker.fetch(
    new Request("https://renderer.test/cached?baserAdminView=published"),
    env,
  );
  assert.equal(admin.headers.get("x-baser-edge-cache"), "BYPASS");
  assert.equal(sessionCalls, 2);
  assert.equal(resolverCalls, 2);
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

test("Public Renderer serves robots.txt and sitemap.xml", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer",
    siteName: "Site",
    hostname: "renderer.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("richText", { paragraphs: ["公開"] }));
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
  const robots = await worker.fetch(new Request("https://renderer.test/robots.txt"), { SITE_ID: boot.siteId });
  const robotsBody = await robots.text();
  assert.equal(robots.status, 200);
  assert.match(robotsBody, /Disallow: \/console\//);
  assert.match(robotsBody, /Sitemap: https:\/\/renderer\.test\/sitemap\.xml/);

  const sitemap = await worker.fetch(new Request("https://renderer.test/sitemap.xml"), { SITE_ID: boot.siteId });
  const xml = await sitemap.text();
  assert.equal(sitemap.status, 200);
  assert.match(xml, /<loc>https:\/\/renderer\.test\/home<\/loc>/);
  assert.ok(!xml.includes("<loc>https://renderer.test/</loc>"));

  const home = await worker.fetch(new Request("https://renderer.test/home"), { SITE_ID: boot.siteId });
  const homeHtml = await home.text();
  assert.match(homeHtml, /rel="canonical" href="https:\/\/renderer\.test\/home"/);
  assert.match(homeHtml, /meta name="description"/);
});
