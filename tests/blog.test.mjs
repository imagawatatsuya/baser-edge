import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { BlogService, MemoryBlogStore } from "@baser-edge/blog-kernel";
import { D1BlogStore, D1CmsStore } from "@baser-edge/cloudflare-adapters";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";

function documentWith(text) {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text }));
  document.root.slots.body.push(createBlock("richText", { paragraphs: [`${text} 本文`] }));
  return document;
}
async function publish(cms, owner, snapshot) {
  const approval = await cms.requestApproval(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  return cms.publish(owner, { contentItemId: snapshot.item.id, revisionId: snapshot.workingRevision.id, approvalId: approval.id });
}
async function memoryFixture() {
  const cms = new CmsService(new MemoryCmsStore());
  const blog = new BlogService(new MemoryBlogStore(), cms);
  const boot = await cms.bootstrap({ workspaceName: "Blog", siteName: "Site", hostname: "blog.test", ownerName: "Owner" });
  return { cms, blog, boot, owner: actor(boot.ownerPrincipalId, "human") };
}

test("blog is a site-tree content and only a blog can contain articles", async () => {
  const { cms, blog, boot, owner } = await memoryFixture();
  const folder = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "newsroom", title: "Newsroom" });
  const created = await blog.createBlog(owner, { siteId: boot.siteId, parentId: folder.node.id, slug: "news", title: "ニュース", document: documentWith("ニュース") });
  assert.equal(created.snapshot.route.path, "/newsroom/news");
  assert.equal(created.taxonomies.length, 2);
  const article = await blog.createArticle(owner, { collectionId: created.collection.id, slug: "release", title: "発表", document: documentWith("発表") });
  assert.equal(article.route.path, "/newsroom/news/release");
  assert.equal(article.item.contentTypeKey, "article");
  await assert.rejects(
    cms.createPage(owner, { siteId: boot.siteId, parentId: created.snapshot.node.id, slug: "invalid", title: "Invalid", document: documentWith("Invalid") }),
    (error) => error instanceof DomainError && error.code === "PARENT_MUST_BE_FOLDER",
  );
});

test("categories and tags are revision-aware and inherited across article revisions", async () => {
  const { cms, blog, boot, owner } = await memoryFixture();
  const created = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "news", title: "ニュース", document: documentWith("ニュース") });
  const taxonomyData = await blog.listTaxonomies(created.collection.id);
  const categoryTaxonomy = taxonomyData.find((entry) => entry.taxonomy.key === "category").taxonomy;
  const tagTaxonomy = taxonomyData.find((entry) => entry.taxonomy.key === "tag").taxonomy;
  const parent = await blog.createTerm(owner, { taxonomyId: categoryTaxonomy.id, slug: "product", title: "製品" });
  const child = await blog.createTerm(owner, { taxonomyId: categoryTaxonomy.id, parentId: parent.id, slug: "release", title: "リリース" });
  const cloudflare = await blog.createTerm(owner, { taxonomyId: tagTaxonomy.id, slug: "cloudflare", title: "Cloudflare" });
  const article = await blog.createArticle(owner, { collectionId: created.collection.id, slug: "one", title: "記事1", document: documentWith("記事1"), termIds: [child.id, cloudflare.id], postedAt: 100 });
  await publish(cms, owner, created.snapshot);
  await publish(cms, owner, article);
  let list = await blog.listPublishedArticles(created.collection.id, { termIds: [child.id] });
  assert.equal(list.total, 1);
  assert.deepEqual(new Set(list.items[0].terms.map((term) => term.id)), new Set([child.id, cloudflare.id]));

  const revision = await cms.commitRevision(owner, {
    contentItemId: article.item.id,
    baseRevisionId: article.workingRevision.id,
    expectedLockVersion: article.item.lockVersion,
    fields: { title: "記事1改訂" },
    document: documentWith("記事1改訂"),
    changeSummary: "改訂",
  });
  const approval = await cms.requestApproval(owner, { contentItemId: article.item.id, revisionId: revision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: article.item.id, revisionId: revision.id, approvalId: approval.id });
  list = await blog.listPublishedArticles(created.collection.id, { termIds: [cloudflare.id] });
  assert.equal(list.total, 1);
  assert.equal(list.items[0].snapshot.publishedRevision.fields.title, "記事1改訂");
});

test("blog listing, category route and RSS render from published revisions", async () => {
  const { cms, blog, boot, owner } = await memoryFixture();
  const created = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "news", title: "ニュース", document: documentWith("ニュース") });
  const categories = await blog.listTaxonomies(created.collection.id);
  const category = categories.find((entry) => entry.taxonomy.key === "category").taxonomy;
  const release = await blog.createTerm(owner, { taxonomyId: category.id, slug: "release", title: "リリース" });
  const first = await blog.createArticle(owner, { collectionId: created.collection.id, slug: "first", title: "最初の記事", document: documentWith("最初の記事"), termIds: [release.id], postedAt: Date.UTC(2026, 6, 1) });
  await publish(cms, owner, created.snapshot);
  await publish(cms, owner, first);
  const worker = createPublicWorker(() => cms, { resolveBlog: () => blog });
  const env = { SITE_ID: boot.siteId };
  const listing = await worker.fetch(new Request("https://blog.test/news"), env);
  assert.equal(listing.status, 200);
  assert.match(await listing.text(), /最初の記事/);
  const filtered = await worker.fetch(new Request("https://blog.test/news/category/release"), env);
  assert.equal(filtered.status, 200);
  assert.match(await filtered.text(), /リリース/);
  const rss = await worker.fetch(new Request("https://blog.test/news/rss.xml"), env);
  assert.equal(rss.status, 200);
  assert.match(rss.headers.get("content-type"), /rss\+xml/);
  assert.match(await rss.text(), /最初の記事/);
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
function migrate(db) {
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
}

test("D1 blog store persists collections, taxonomy and revision classification", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const shim = new D1Shim(db);
  const cms = new CmsService(new D1CmsStore(shim));
  const blog = new BlogService(new D1BlogStore(shim), cms);
  const boot = await cms.bootstrap({ workspaceName: "D1 Blog", siteName: "Site", hostname: "d1-blog.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const created = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "journal", title: "日誌", document: documentWith("日誌") });
  const taxonomies = await blog.listTaxonomies(created.collection.id);
  const tag = taxonomies.find((entry) => entry.taxonomy.key === "tag").taxonomy;
  const moonbit = await blog.createTerm(owner, { taxonomyId: tag.id, slug: "moonbit", title: "MoonBit" });
  const article = await blog.createArticle(owner, { collectionId: created.collection.id, slug: "entry", title: "記事", document: documentWith("記事"), termIds: [moonbit.id] });
  await publish(cms, owner, created.snapshot);
  await publish(cms, owner, article);
  const listed = await blog.listPublishedArticles(created.collection.id, { termIds: [moonbit.id] });
  assert.equal(listed.total, 1);
  assert.equal(db.prepare("SELECT count(*) AS count FROM blog_collections").get().count, 1);
  assert.equal(db.prepare("SELECT count(*) AS count FROM revision_taxonomy_values").get().count, 2);
  db.close();
});

test("generic Content Manager refuses blog-aware copies and cross-blog article moves", async () => {
  const { cms, blog, boot, owner } = await memoryFixture();
  const firstBlog = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "first-blog", title: "First", document: documentWith("First") });
  const secondBlog = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "second-blog", title: "Second", document: documentWith("Second") });
  const article = await blog.createArticle(owner, { collectionId: firstBlog.collection.id, slug: "entry", title: "Entry", document: documentWith("Entry") });
  await assert.rejects(
    cms.copyContent(owner, { contentItemId: firstBlog.snapshot.item.id, targetParentId: null, newSlug: "copy", expectedTreeVersion: firstBlog.snapshot.node.treeVersion }),
    (error) => error instanceof DomainError && error.code === "BLOG_COPY_NOT_IMPLEMENTED",
  );
  await assert.rejects(
    cms.relocateContent(owner, { contentItemId: article.item.id, targetParentId: secondBlog.snapshot.node.id, newSlug: "entry", expectedTreeVersion: article.node.treeVersion }),
    (error) => error instanceof DomainError && error.code === "ARTICLE_CROSS_BLOG_MOVE_NOT_IMPLEMENTED",
  );
});
