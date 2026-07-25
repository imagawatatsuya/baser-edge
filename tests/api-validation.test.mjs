import test from "node:test";
import assert from "node:assert/strict";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";

const cms = new CmsService(new MemoryCmsStore());
const worker = createApiWorker(() => cms);

test("POST /v1/pages rejects non-ASCII slugs with INVALID_SLUG", async () => {
  const bootstrapResponse = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "W", siteName: "S", hostname: "slug.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const pageResponse = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "ニュース",
      title: "ニュース",
      document: {
        formatVersion: 1,
        root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } },
      },
    }),
  }), {});
  assert.equal(pageResponse.status, 422);
  const body = await pageResponse.json();
  assert.equal(body.error?.code, "INVALID_SLUG");
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
