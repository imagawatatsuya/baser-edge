import test from "node:test";
import assert from "node:assert/strict";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";

const cms = new CmsService(new MemoryCmsStore());
const worker = createApiWorker(() => cms);

const emptyDocument = {
  formatVersion: 1,
  root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } },
};

async function bootSession(hostname) {
  const bootstrapResponse = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "W", siteName: "S", hostname, ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  return {
    boot,
    headers: {
      "content-type": "application/json",
      "x-baser-principal-id": boot.ownerPrincipalId,
      "x-baser-principal-type": "human",
    },
  };
}

async function assertInvalidSlug(responsePromise) {
  const response = await responsePromise;
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.error?.code, "INVALID_SLUG");
}

test("POST /v1/pages rejects non-ASCII slugs with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-page.test");
  await assertInvalidSlug(worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "ニュース",
      title: "ニュース",
      document: emptyDocument,
    }),
  }), {}));
});

test("POST /v1/folders and /v1/blogs reject non-ASCII slugs with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-tree.test");
  await assertInvalidSlug(worker.fetch(new Request("https://api.test/v1/folders", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "資料", title: "Docs" }),
  }), {}));
  await assertInvalidSlug(worker.fetch(new Request("https://api.test/v1/blogs", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "ブログ", title: "Blog", document: emptyDocument }),
  }), {}));
});

test("POST /v1/blogs/:id/articles rejects non-ASCII slugs with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-article.test");
  const blogResponse = await worker.fetch(new Request("https://api.test/v1/blogs", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "news", title: "News", document: emptyDocument }),
  }), {});
  const blog = await blogResponse.json();
  await assertInvalidSlug(worker.fetch(new Request(`https://api.test/v1/blogs/${blog.collection.id}/articles`, {
    method: "POST",
    headers,
    body: JSON.stringify({ slug: "記事", title: "Post", document: emptyDocument }),
  }), {}));
});

test("POST /v1/content/:id/move rejects non-ASCII newSlug with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-move.test");
  const pageResponse = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "move-me", title: "Move", document: emptyDocument }),
  }), {});
  const page = await pageResponse.json();
  const rejected = await worker.fetch(new Request(`https://api.test/v1/content/${page.item.id}/move`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      targetParentId: null,
      newSlug: "移動先",
      expectedTreeVersion: page.node.treeVersion,
    }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error?.code, "INVALID_SLUG");
});

test("POST /v1/content/:id/copy rejects non-ASCII newSlug with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-copy.test");
  const folderResponse = await worker.fetch(new Request("https://api.test/v1/folders", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "copy-src", title: "Src" }),
  }), {});
  const folder = await folderResponse.json();
  const rejected = await worker.fetch(new Request(`https://api.test/v1/content/${folder.item.id}/copy`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      newSlug: "コピー",
      expectedTreeVersion: folder.node.treeVersion,
    }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error?.code, "INVALID_SLUG");
});

test("POST /v1/content/:id/move-impact rejects non-ASCII newSlug with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-impact.test");
  const pageResponse = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "impact-me", title: "Impact", document: emptyDocument }),
  }), {});
  const page = await pageResponse.json();
  const rejected = await worker.fetch(new Request(`https://api.test/v1/content/${page.item.id}/move-impact`, {
    method: "POST",
    headers,
    body: JSON.stringify({ targetParentId: null, newSlug: "影響" }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error?.code, "INVALID_SLUG");
});

test("POST /v1/blogs rejects out-of-range pageSize", async () => {
  const { boot, headers } = await bootSession("blog-size.test");
  const rejected = await worker.fetch(new Request("https://api.test/v1/blogs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "sized",
      title: "Sized",
      document: emptyDocument,
      pageSize: 500,
    }),
  }), {});
  assert.equal(rejected.status, 422);
});

test("GET /v1/blogs/:id/articles rejects invalid pagination query", async () => {
  const bootstrapResponse = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Blog", siteName: "Blog", hostname: "blog-pag.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const blogResponse = await worker.fetch(new Request("https://api.test/v1/blogs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "news",
      title: "News",
      document: { formatVersion: 1, root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } } },
    }),
  }), {});
  const blog = await blogResponse.json();
  const badLimit = await worker.fetch(new Request(`https://api.test/v1/blogs/${blog.collection.id}/articles?limit=9999`, { headers }), {});
  assert.equal(badLimit.status, 422);
  const badOffset = await worker.fetch(new Request(`https://api.test/v1/blogs/${blog.collection.id}/articles?offset=-1`, { headers }), {});
  assert.equal(badOffset.status, 422);
  const badLimitType = await worker.fetch(new Request(`https://api.test/v1/blogs/${blog.collection.id}/articles?limit=abc`, { headers }), {});
  assert.equal(badLimitType.status, 422);
});

test("GET /v1/sites/:siteId/approval-inbox returns content and custom entry queues", async () => {
  const bootstrapResponse = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Inbox", siteName: "Inbox", hostname: "inbox.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const inboxResponse = await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/approval-inbox`, { headers }), {});
  assert.equal(inboxResponse.status, 200);
  const inbox = await inboxResponse.json();
  assert.ok(Array.isArray(inbox.content));
  assert.ok(Array.isArray(inbox.customEntries));
});
