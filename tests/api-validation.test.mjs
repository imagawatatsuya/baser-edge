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

test("POST /v1/bootstrap rejects invalid hostnames with INVALID_HOSTNAME", async () => {
  for (const hostname of ["日本語.test", "singlelabel", "bad host.test"]) {
    const response = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceName: "W", siteName: "S", hostname, ownerName: "Owner" }),
    }), {});
    assert.equal(response.status, 422, hostname);
    assert.equal((await response.json()).error?.code, "INVALID_HOSTNAME", hostname);
  }
});

test("POST /v1/aliases rejects non-ASCII slugs with INVALID_SLUG", async () => {
  const { boot, headers } = await bootSession("slug-alias.test");
  const pageResponse = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "target", title: "Target", document: emptyDocument }),
  }), {});
  const page = await pageResponse.json();
  const rejected = await worker.fetch(new Request("https://api.test/v1/aliases", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "別名",
      title: "Alias",
      targetContentItemId: page.item.id,
    }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error?.code, "INVALID_SLUG");
});

test("POST /v1/custom-contents rejects non-ASCII slugs with INVALID_SLUG", async () => {
  const { CustomContentService, MemoryCustomContentStore } = await import("@baser-edge/custom-content-kernel");
  const localCms = new CmsService(new MemoryCmsStore());
  const localCustom = new CustomContentService(new MemoryCustomContentStore(), localCms);
  const localWorker = createApiWorker(() => localCms, { resolveCustomContent: () => localCustom });
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "CustomSlug", siteName: "S", hostname: "custom-slug.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const fieldResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-fields", {
    method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "name", name: "名称", type: "text" }),
  }), {});
  const field = await fieldResponse.json();
  const tableResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-tables", {
    method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "items", name: "Items", kind: "content", displayFieldKey: "name" }),
  }), {});
  const table = await tableResponse.json();
  await localWorker.fetch(new Request(`https://api.test/v1/custom-tables/${table.id}/fields`, {
    method: "POST", headers, body: JSON.stringify({ fieldId: field.id, required: true }),
  }), {});
  const rejected = await localWorker.fetch(new Request("https://api.test/v1/custom-contents", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "商品", title: "商品", tableId: table.id }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.equal((await rejected.json()).error?.code, "INVALID_SLUG");
});

test("GET /v1/sites/:siteId/content-tree rejects malformed siteId", async () => {
  const { boot, headers } = await bootSession("site-id.test");
  const rejected = await worker.fetch(new Request("https://api.test/v1/sites/not-a-site/content-tree", { headers }), {});
  assert.equal(rejected.status, 422);
  const ok = await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/content-tree`, { headers }), {});
  assert.equal(ok.status, 200);
});

test("POST /v1/pages rejects malformed siteId in body", async () => {
  const { headers } = await bootSession("site-body.test");
  const rejected = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: "not-a-site",
      slug: "ok",
      title: "Ok",
      document: emptyDocument,
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
