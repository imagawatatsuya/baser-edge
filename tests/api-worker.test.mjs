import test from "node:test";
import assert from "node:assert/strict";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";

const cms = new CmsService(new MemoryCmsStore());
const worker = createApiWorker(() => cms);

test("bootstrap requires the provision secret when configured", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const env = { BASER_BOOTSTRAP_SECRET: "trial-bootstrap-secret" };
  const body = JSON.stringify({
    workspaceName: "Secret",
    siteName: "Secret Site",
    hostname: "secret.test",
    ownerName: "Owner",
  });

  for (const headers of [
    { "content-type": "application/json" },
    { "content-type": "application/json", "x-baser-bootstrap-secret": "wrong-secret" },
  ]) {
    const rejected = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
      method: "POST",
      headers,
      body,
    }), env);
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error.code, "BOOTSTRAP_SECRET_INVALID");
  }

  const accepted = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-bootstrap-secret": env.BASER_BOOTSTRAP_SECRET,
    },
    body,
  }), env);
  assert.equal(accepted.status, 201);
  const boot = await accepted.json();
  const home = await localCms.findPublicByPath(boot.siteId, "/home");
  assert.equal(home?.route.path, "/home");
  assert.ok(home?.publishedRevision);
});

test("bootstrap readiness verifies the deployed provision secret without creating data", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const env = { BASER_BOOTSTRAP_SECRET: "trial-bootstrap-secret" };

  for (const headers of [
    {},
    { "x-baser-bootstrap-secret": "wrong-secret" },
  ]) {
    const rejected = await localWorker.fetch(new Request("https://api.test/v1/bootstrap/ready", {
      method: "POST",
      headers,
    }), env);
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error.code, "BOOTSTRAP_SECRET_INVALID");
  }

  const accepted = await localWorker.fetch(new Request("https://api.test/v1/bootstrap/ready", {
    method: "POST",
    headers: { "x-baser-bootstrap-secret": env.BASER_BOOTSTRAP_SECRET },
  }), env);
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { ready: true });
});

test("authenticated bootstrap reports the bounded D1 cause to the provisioner", async () => {
  class FailingBootstrapStore extends MemoryCmsStore {
    async bootstrap() {
      throw new Error("D1_ERROR: no such table: content_types");
    }
  }
  const failingCms = new CmsService(new FailingBootstrapStore());
  const localWorker = createApiWorker(() => failingCms);
  const response = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-bootstrap-secret": "trial-bootstrap-secret",
    },
    body: JSON.stringify({
      workspaceName: "Failure",
      siteName: "Failure Site",
      hostname: "failure.test",
      ownerName: "Owner",
    }),
  }), { BASER_BOOTSTRAP_SECRET: "trial-bootstrap-secret" });
  assert.equal(response.status, 500);
  const error = (await response.json()).error;
  assert.equal(error.code, "BOOTSTRAP_FAILED");
  assert.equal(error.details.cause, "D1_ERROR: no such table: content_types");
});

test("API exposes bootstrap and authenticated page creation", async () => {
  const bootstrapResponse = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "W", siteName: "S", hostname: "example.test", ownerName: "Owner" }),
  }), {});
  assert.equal(bootstrapResponse.status, 201);
  const boot = await bootstrapResponse.json();

  const pageResponse = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-principal-id": boot.ownerPrincipalId,
      "x-baser-principal-type": "human",
    },
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "hello",
      title: "Hello",
      document: {
        formatVersion: 1,
        root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } },
      },
    }),
  }), {});
  assert.equal(pageResponse.status, 201);
  const page = await pageResponse.json();
  assert.equal(page.route.path, "/hello");
});

test("API exposes Content Manager folder, alias, copy and trash operations", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "CM", siteName: "CM", hostname: "cm-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const folderResponse = await localWorker.fetch(new Request("https://api.test/v1/folders", {
    method: "POST", headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "company", title: "会社" }),
  }), {});
  assert.equal(folderResponse.status, 201);
  const folder = await folderResponse.json();
  const treeResponse = await localWorker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/content-tree`, { headers }), {});
  assert.equal(treeResponse.status, 200);
  assert.equal((await treeResponse.json()).length, 1);

  const copyResponse = await localWorker.fetch(new Request(`https://api.test/v1/content/${folder.item.id}/copy`, {
    method: "POST", headers,
    body: JSON.stringify({ newSlug: "company-copy", expectedTreeVersion: folder.node.treeVersion }),
  }), {});
  assert.equal(copyResponse.status, 201);

  const trashResponse = await localWorker.fetch(new Request(`https://api.test/v1/content/${folder.item.id}/trash`, {
    method: "POST", headers,
    body: JSON.stringify({ expectedTreeVersion: folder.node.treeVersion }),
  }), {});
  assert.equal(trashResponse.status, 200);
  const trashListResponse = await localWorker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/trash`, { headers }), {});
  assert.equal((await trashListResponse.json()).length, 1);

  const badTrash = await localWorker.fetch(new Request(`https://api.test/v1/content/${folder.item.id}/trash`, {
    method: "POST", headers,
    body: JSON.stringify({ expectedTreeVersion: folder.node.treeVersion }),
  }), {});
  assert.equal(badTrash.status, 409);
  assert.equal((await badTrash.json()).error?.code, "ALREADY_TRASHED");
});

test("API DELETE /v1/assets soft-deletes unused asset and maps ASSET_IN_USE to 409", async () => {
  const { actor } = await import("@baser-edge/content-kernel");
  const { createBlock, createEmptyDocument } = await import("@baser-edge/structured-document");
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Asset Delete", siteName: "Assets", hostname: "asset-del.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const owner = actor(boot.ownerPrincipalId, "human");

  async function uploadReady(filename) {
    const sessionRes = await localWorker.fetch(new Request("https://api.test/v1/assets/upload-sessions", {
      method: "POST", headers,
      body: JSON.stringify({ workspaceId: boot.workspaceId, filename, mediaType: "image/png", maximumBytes: 16 }),
    }), {});
    assert.equal(sessionRes.status, 201);
    const upload = await sessionRes.json();
    const putRes = await localWorker.fetch(new Request(upload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png", "content-length": "3" },
      body: new Uint8Array([1, 2, 3]),
    }), {});
    assert.equal(putRes.status, 201);
    return putRes.json();
  }

  const spare = await uploadReady("spare.png");
  const deleteSpare = await localWorker.fetch(new Request(`https://api.test/v1/assets/${spare.id}`, { method: "DELETE", headers }), {});
  assert.equal(deleteSpare.status, 200);
  assert.ok((await deleteSpare.json()).deletedAt);
  const listAfterDelete = await localWorker.fetch(new Request(`https://api.test/v1/assets?workspaceId=${boot.workspaceId}`, { headers }), {});
  assert.equal((await listAfterDelete.json()).length, 0);

  const used = await uploadReady("used.png");
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("image", { assetId: used.id, alt: "hero" }));
  const page = await localCms.createPage(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "uses-asset-api",
    title: "Uses asset",
    document,
  });
  const approval = await localCms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await localCms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await localCms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });

  const blocked = await localWorker.fetch(new Request(`https://api.test/v1/assets/${used.id}`, { method: "DELETE", headers }), {});
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error?.code, "ASSET_IN_USE");
});

test("API issues signed upload sessions and revocable preview sessions", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Media API", siteName: "Media", hostname: "media-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const authHeaders = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const uploadSessionResponse = await localWorker.fetch(new Request("https://api.test/v1/assets/upload-sessions", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ workspaceId: boot.workspaceId, filename: "api.png", mediaType: "image/png", maximumBytes: 10 }),
  }), {});
  assert.equal(uploadSessionResponse.status, 201);
  const upload = await uploadSessionResponse.json();
  const putResponse = await localWorker.fetch(new Request(upload.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": "3" },
    body: new Uint8Array([1, 2, 3]),
  }), {});
  assert.equal(putResponse.status, 201);
  assert.equal((await putResponse.json()).state, "ready");
  const listResponse = await localWorker.fetch(new Request(`https://api.test/v1/assets?workspaceId=${boot.workspaceId}`, { headers: authHeaders }), {});
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).length, 1);

  const pageResponse = await localWorker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "preview-api",
      title: "Preview API",
      document: { formatVersion: 1, root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } } },
    }),
  }), {});
  const page = await pageResponse.json();
  const previewResponse = await localWorker.fetch(new Request(`https://api.test/v1/content/${page.item.id}/previews`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ revisionId: page.workingRevision.id }),
  }), {});
  assert.equal(previewResponse.status, 201);
  const preview = await previewResponse.json();
  assert.match(preview.previewUrl, /\/_preview\//);
  const revokeResponse = await localWorker.fetch(new Request(`https://api.test/v1/previews/${preview.session.id}/revoke`, { method: "POST", headers: authHeaders }), {});
  assert.equal(revokeResponse.status, 200);
  assert.ok((await revokeResponse.json()).revokedAt);
});

test("API exposes baser-style blog, article, taxonomy and listing operations", async () => {
  const { BlogService, MemoryBlogStore } = await import("@baser-edge/blog-kernel");
  const localCms = new CmsService(new MemoryCmsStore());
  const localBlog = new BlogService(new MemoryBlogStore(), localCms);
  const localWorker = createApiWorker(() => localCms, { resolveBlog: () => localBlog });
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Blog API", siteName: "Blog", hostname: "blog-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const emptyDocument = { formatVersion: 1, root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } } };
  const blogResponse = await localWorker.fetch(new Request("https://api.test/v1/blogs", {
    method: "POST", headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "news", title: "ニュース", document: emptyDocument }),
  }), {});
  assert.equal(blogResponse.status, 201);
  const created = await blogResponse.json();
  const taxonomyResponse = await localWorker.fetch(new Request(`https://api.test/v1/blogs/${created.collection.id}/taxonomies`, { headers }), {});
  const taxonomies = await taxonomyResponse.json();
  const category = taxonomies.find((entry) => entry.taxonomy.key === "category").taxonomy;
  const termResponse = await localWorker.fetch(new Request(`https://api.test/v1/taxonomies/${category.id}/terms`, {
    method: "POST", headers,
    body: JSON.stringify({ slug: "release", title: "リリース" }),
  }), {});
  assert.equal(termResponse.status, 201);
  const term = await termResponse.json();
  const articleResponse = await localWorker.fetch(new Request(`https://api.test/v1/blogs/${created.collection.id}/articles`, {
    method: "POST", headers,
    body: JSON.stringify({ slug: "first", title: "最初", document: emptyDocument, termIds: [term.id] }),
  }), {});
  assert.equal(articleResponse.status, 201);
  const article = await articleResponse.json();
  assert.equal(article.route.path, "/news/first");
  const listResponse = await localWorker.fetch(new Request(`https://api.test/v1/blogs/${created.collection.id}/articles`, { headers }), {});
  assert.equal(listResponse.status, 200);
  assert.equal((await listResponse.json()).total, 0, "unpublished articles must not appear in public listing");
});

test("API exposes Custom Content field, table, entry revision and approval operations", async () => {
  const { CustomContentService, MemoryCustomContentStore } = await import("@baser-edge/custom-content-kernel");
  const localCms = new CmsService(new MemoryCmsStore());
  const localCustom = new CustomContentService(new MemoryCustomContentStore(), localCms);
  const localWorker = createApiWorker(() => localCms, { resolveCustomContent: () => localCustom });
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Custom API", siteName: "Custom", hostname: "custom-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const fieldResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-fields", { method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "name", name: "名称", type: "text" }) }), {});
  assert.equal(fieldResponse.status, 201); const field = await fieldResponse.json();
  const tableResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-tables", { method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "shops", name: "店舗", kind: "content", displayFieldKey: "name" }) }), {});
  assert.equal(tableResponse.status, 201); const table = await tableResponse.json();
  const attachResponse = await localWorker.fetch(new Request(`https://api.test/v1/custom-tables/${table.id}/fields`, { method: "POST", headers, body: JSON.stringify({ fieldId: field.id, required: true, searchable: true }) }), {});
  assert.equal(attachResponse.status, 201);
  const customResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-contents", { method: "POST", headers, body: JSON.stringify({ siteId: boot.siteId, slug: "shops", title: "店舗", tableId: table.id }) }), {});
  assert.equal(customResponse.status, 201); const custom = await customResponse.json();
  const customListResponse = await localWorker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/custom-contents`, { headers }), {});
  assert.equal(customListResponse.status, 200);
  const customList = await customListResponse.json();
  assert.equal(customList.length, 1);
  assert.equal(customList[0].schema.table.id, table.id);
  const entryResponse = await localWorker.fetch(new Request(`https://api.test/v1/custom-contents/${custom.definition.id}/entries`, { method: "POST", headers, body: JSON.stringify({ slug: "tokyo", values: { name: "東京店" } }) }), {});
  assert.equal(entryResponse.status, 201); const entry = await entryResponse.json();
  const approvalResponse = await localWorker.fetch(new Request(`https://api.test/v1/custom-entries/${entry.entry.id}/approvals`, { method: "POST", headers, body: JSON.stringify({ revisionId: entry.workingRevision.id }) }), {});
  assert.equal(approvalResponse.status, 201); const approval = await approvalResponse.json();
  const decideResponse = await localWorker.fetch(new Request(`https://api.test/v1/custom-entry-approvals/${approval.id}/decide`, { method: "POST", headers, body: JSON.stringify({ decision: "approved" }) }), {});
  assert.equal(decideResponse.status, 200);
  const publishResponse = await localWorker.fetch(new Request(`https://api.test/v1/custom-entries/${entry.entry.id}/publish`, { method: "POST", headers, body: JSON.stringify({ revisionId: entry.workingRevision.id, approvalId: approval.id }) }), {});
  assert.equal(publishResponse.status, 200); assert.equal((await publishResponse.json()).publishedRevision.values.name, "東京店");
});

test("API exposes Mail Form creation, listing, submissions, and notification delivery", async () => {
  const { CustomContentService, MemoryCustomContentStore } = await import("@baser-edge/custom-content-kernel");
  const { MailFormService, MemoryMailFormStore, MemoryMailSender } = await import("@baser-edge/mail-form-kernel");
  const localCms = new CmsService(new MemoryCmsStore());
  const localCustom = new CustomContentService(new MemoryCustomContentStore(), localCms);
  const sender = new MemoryMailSender();
  const localMail = new MailFormService({ store: new MemoryMailFormStore(), cms: localCms, customContent: localCustom, signingSecret: "api-mail-secret", sender });
  const localWorker = createApiWorker(() => localCms, { resolveCustomContent: () => localCustom, resolveMailForms: () => localMail });
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Mail API", siteName: "Mail", hostname: "mail-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const emailResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-fields", { method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "email", name: "メール", type: "email" }) }), {});
  const email = await emailResponse.json();
  const messageResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-fields", { method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "message", name: "内容", type: "textarea" }) }), {});
  const message = await messageResponse.json();
  const tableResponse = await localWorker.fetch(new Request("https://api.test/v1/custom-tables", { method: "POST", headers, body: JSON.stringify({ workspaceId: boot.workspaceId, key: "contact_form", name: "お問い合わせ", kind: "content" }) }), {});
  const table = await tableResponse.json();
  for (const field of [email, message]) {
    const attach = await localWorker.fetch(new Request(`https://api.test/v1/custom-tables/${table.id}/fields`, { method: "POST", headers, body: JSON.stringify({ fieldId: field.id, required: true }) }), {});
    assert.equal(attach.status, 201);
  }
  const formResponse = await localWorker.fetch(new Request("https://api.test/v1/mail-forms", { method: "POST", headers, body: JSON.stringify({ siteId: boot.siteId, tableId: table.id, title: "お問い合わせ", slug: "contact", recipientEmails: ["owner@example.com"], senderAddress: "noreply@example.com", autoReplyEnabled: true, autoReplyEmailFieldKey: "email", turnstileRequired: false }) }), {});
  assert.equal(formResponse.status, 201); const form = await formResponse.json();
  const listResponse = await localWorker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/mail-forms`, { headers }), {});
  assert.equal(listResponse.status, 200); assert.equal((await listResponse.json()).length, 1);
  const submissionsResponse = await localWorker.fetch(new Request(`https://api.test/v1/mail-forms/${form.definition.id}/submissions`, { headers }), {});
  assert.equal(submissionsResponse.status, 200); assert.deepEqual(await submissionsResponse.json(), []);
  const deliveryResponse = await localWorker.fetch(new Request("https://api.test/v1/mail-notifications/deliver", { method: "POST", headers, body: JSON.stringify({ limit: 10 }) }), {});
  assert.equal(deliveryResponse.status, 200); assert.deepEqual(await deliveryResponse.json(), { sent: 0, failed: 0 });
});

test("API POST /v1/grants rejects unknown scope keys", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Grants", siteName: "Grants", hostname: "grants.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const agentResponse = await localWorker.fetch(new Request("https://api.test/v1/principals", {
    method: "POST",
    headers,
    body: JSON.stringify({ workspaceId: boot.workspaceId, type: "agent", displayName: "Agent" }),
  }), {});
  assert.equal(agentResponse.status, 201);
  const agent = await agentResponse.json();
  const badScope = await localWorker.fetch(new Request("https://api.test/v1/grants", {
    method: "POST",
    headers,
    body: JSON.stringify({
      principalId: agent.id,
      capability: "content.read",
      scope: { workspaceId: boot.workspaceId, rogue: true },
    }),
  }), {});
  assert.equal(badScope.status, 422);
  assert.match((await badScope.json()).error?.message ?? "", /scope\.rogue/);
});

test("API POST /v1/mail-notifications/deliver validates limit bounds", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "MailLimit", siteName: "Mail", hostname: "mail-limit.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  for (const body of [{ limit: 101 }, { limit: 0 }, { limit: 1.5 }]) {
    const rejected = await localWorker.fetch(new Request("https://api.test/v1/mail-notifications/deliver", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }), {});
    assert.equal(rejected.status, 422, JSON.stringify(body));
  }
});

test("API tree mutations return 409 for stale expectedTreeVersion", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "TreeVer", siteName: "Tree", hostname: "tree-ver.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const folderResponse = await localWorker.fetch(new Request("https://api.test/v1/folders", {
    method: "POST",
    headers,
    body: JSON.stringify({ siteId: boot.siteId, slug: "docs", title: "Docs" }),
  }), {});
  const folder = await folderResponse.json();
  const stale = await localWorker.fetch(new Request(`https://api.test/v1/content/${folder.item.id}/trash`, {
    method: "POST",
    headers,
    body: JSON.stringify({ expectedTreeVersion: folder.node.treeVersion - 1 }),
  }), {});
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error?.code, "TREE_CONFLICT");
});

test("API rejects invalid workspaceId query on asset list", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "WsQuery", siteName: "S", hostname: "ws-query.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const rejected = await localWorker.fetch(new Request("https://api.test/v1/assets?workspaceId=not-a-workspace", { headers }), {});
  assert.equal(rejected.status, 422);
});

test("API rejects malformed agent proposal operations", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Agent", siteName: "Agent", hostname: "agent-api.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const pageResponse = await localWorker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      siteId: boot.siteId,
      slug: "agent-probe",
      title: "Probe",
      document: {
        formatVersion: 1,
        root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: [] } },
      },
    }),
  }), {});
  assert.equal(pageResponse.status, 201);
  const page = await pageResponse.json();
  const contentId = page.item.id;
  const snapshotResponse = await localWorker.fetch(new Request(`https://api.test/v1/content/${contentId}`, { headers }), {});
  const snapshot = await snapshotResponse.json();
  const rejected = await localWorker.fetch(new Request(`https://api.test/v1/content/${contentId}/agent-proposals`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      baseRevisionId: snapshot.workingRevision.id,
      expectedLockVersion: snapshot.item.lockVersion,
      operations: [{ kind: "not-supported" }],
      instructionSummary: "test",
      modelProvider: "test",
      modelName: "test",
    }),
  }), {});
  assert.equal(rejected.status, 422);
  assert.match((await rejected.json()).error?.message ?? "", /operations\[0\]\.kind/);
});

test("API plugin-routes POST rejects non-object JSON body", async () => {
  const localCms = new CmsService(new MemoryCmsStore());
  const localWorker = createApiWorker(() => localCms);
  const bootstrapResponse = await localWorker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "PluginRoute", siteName: "P", hostname: "plugin-route.test", ownerName: "Owner" }),
  }), {});
  const boot = await bootstrapResponse.json();
  const headers = { "content-type": "application/json", "x-baser-principal-id": boot.ownerPrincipalId, "x-baser-principal-type": "human" };
  const rejected = await localWorker.fetch(new Request(`https://api.test/v1/plugin-routes/demo?workspaceId=${encodeURIComponent(boot.workspaceId)}`, {
    method: "POST",
    headers,
    body: "[]",
  }), {});
  assert.equal(rejected.status, 422);
});
