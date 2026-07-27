import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { AssetService, MemoryAssetMetadataStore, MemoryAssetObjectStore } from "@baser-edge/asset-kernel";
import { MemoryPreviewStore, PreviewService } from "@baser-edge/preview-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";

function security(cms) {
  return {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms),
  };
}

async function setup(now = Date.now()) {
  const clock = { value: now, now() { return this.value; } };
  const cms = new CmsService(new MemoryCmsStore(), { clock });
  const boot = await cms.bootstrap({ workspaceName: "Assets", siteName: "Site", hostname: "assets.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const metadata = new MemoryAssetMetadataStore();
  const objects = new MemoryAssetObjectStore();
  const assets = new AssetService({
    metadata,
    objects,
    security: security(cms),
    signingSecret: "asset-secret-for-tests",
    clock,
    usageInspector: { listPublishedReferences: cms.store.listPublishedAssetReferences.bind(cms.store) },
  });
  const previewStore = new MemoryPreviewStore();
  const previews = new PreviewService({ store: previewStore, cms, security: security(cms), signingSecret: "preview-secret-for-tests", clock });
  return { clock, cms, boot, owner, metadata, objects, assets, previewStore, previews };
}

test("signed asset upload enforces token, media type and size then exposes a ready asset", async () => {
  const { assets, boot, owner } = await setup();
  const created = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "写真 01.png",
    mediaType: "image/png",
    maximumBytes: 32,
    uploadBaseUrl: "https://api.test",
  });
  assert.match(created.asset.objectKey, /写真-01\.png$/u);
  const token = new URL(created.uploadUrl).searchParams.get("token");
  assert.ok(token);
  await assert.rejects(
    assets.uploadWithToken({ sessionId: created.session.id, token, mediaType: "image/jpeg", body: new Uint8Array([1]) }),
    (error) => error instanceof DomainError && error.code === "UPLOAD_MEDIA_TYPE_MISMATCH",
  );
  const ready = await assets.uploadWithToken({
    sessionId: created.session.id,
    token,
    mediaType: "image/png",
    contentLength: 4,
    body: new Uint8Array([137, 80, 78, 71]),
  });
  assert.equal(ready.state, "ready");
  assert.equal(ready.byteSize, 4);
  const publicAsset = await assets.getPublicAsset(ready.id);
  assert.ok(publicAsset);
  assert.equal(await new Response(publicAsset.object.body).arrayBuffer().then((v) => v.byteLength), 4);
  await assert.rejects(
    assets.uploadWithToken({ sessionId: created.session.id, token, mediaType: "image/png", body: new Uint8Array([1]) }),
    (error) => error instanceof DomainError && error.code === "UPLOAD_SESSION_CLOSED",
  );
});

test("asset upload rejects tampering, expiry and oversized bodies", async () => {
  const { assets, boot, owner, clock } = await setup(1_000_000);
  const created = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "file.txt",
    mediaType: "text/plain",
    maximumBytes: 3,
    expiresInSeconds: 60,
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(created.uploadUrl).searchParams.get("token");
  assert.ok(token);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  await assert.rejects(
    assets.uploadWithToken({ sessionId: created.session.id, token: tampered, mediaType: "text/plain", body: "a" }),
    (error) => error instanceof DomainError && error.code === "INVALID_UPLOAD_TOKEN",
  );
  await assert.rejects(
    assets.uploadWithToken({ sessionId: created.session.id, token, mediaType: "text/plain", contentLength: 4, body: "four" }),
    (error) => error instanceof DomainError && error.code === "UPLOAD_TOO_LARGE",
  );
  clock.value += 61_000;
  await assert.rejects(
    assets.uploadWithToken({ sessionId: created.session.id, token, mediaType: "text/plain", body: "a" }),
    (error) => error instanceof DomainError && error.code === "UPLOAD_TOKEN_EXPIRED",
  );
});

test("preview token pins an immutable revision and can be revoked", async () => {
  const { cms, boot, owner, previews } = await setup();
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Preview only" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "preview", title: "Preview", document });
  const created = await previews.create(owner, {
    contentItemId: page.item.id,
    revisionId: page.workingRevision.id,
    previewBaseUrl: "https://preview.test",
  });
  const token = decodeURIComponent(new URL(created.previewUrl).pathname.replace("/_preview/", ""));
  const resolved = await previews.resolve(token);
  assert.equal(resolved.revision.id, page.workingRevision.id);
  assert.equal(resolved.revision.contentHash, created.session.revisionHash);
  await previews.revoke(owner, created.session.id);
  await assert.rejects(previews.resolve(token), (error) => error instanceof DomainError && error.code === "PREVIEW_REVOKED");
});

test("public worker serves signed previews and ready assets without publishing the revision", async () => {
  const { cms, boot, owner, previews, assets } = await setup();
  const upload = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "hero.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const uploadToken = new URL(upload.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({ sessionId: upload.session.id, token: uploadToken, mediaType: "image/png", body: new Uint8Array([1, 2, 3]) });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Unpublished" }));
  document.root.slots.body.push(createBlock("image", { assetId: ready.id, alt: "hero" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "unpublished", title: "Unpublished", document });
  const created = await previews.create(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, previewBaseUrl: "https://public.test" });
  const worker = createPublicWorker(() => cms, { resolvePreview: () => previews, resolveAssets: () => assets });
  const previewResponse = await worker.fetch(new Request(created.previewUrl), {});
  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  const previewText = await previewResponse.text();
  assert.match(previewText, /Unpublished/);
  assert.match(previewText, /下書きプレビュー（未公開）/);
  const normalResponse = await worker.fetch(new Request("https://public.test/unpublished"), { SITE_ID: boot.siteId });
  assert.equal(normalResponse.status, 404);
  const assetResponse = await worker.fetch(new Request(`https://public.test/assets/${ready.id}`), { SITE_ID: boot.siteId });
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("content-type"), "image/png");
  assert.equal((await assetResponse.arrayBuffer()).byteLength, 3);
});

test("public worker returns 404 for assets not referenced by published or preview revisions", async () => {
  const { cms, boot, owner, assets, previews } = await setup();
  const upload = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "orphan.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(upload.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({ sessionId: upload.session.id, token, mediaType: "image/png", body: new Uint8Array([5]) });
  const worker = createPublicWorker(() => cms, { resolvePreview: () => previews, resolveAssets: () => assets });
  const blocked = await worker.fetch(new Request(`https://public.test/assets/${ready.id}`), { SITE_ID: boot.siteId });
  assert.equal(blocked.status, 404);
});

test("public worker serves assets referenced only by published revision", async () => {
  const { cms, boot, owner, assets } = await setup();
  const upload = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "live.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(upload.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({ sessionId: upload.session.id, token, mediaType: "image/png", body: new Uint8Array([7]) });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("image", { assetId: ready.id, alt: "live" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "live-asset", title: "Live", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
  const worker = createPublicWorker(() => cms, { resolveAssets: () => assets });
  const ok = await worker.fetch(new Request(`https://public.test/assets/${ready.id}`), { SITE_ID: boot.siteId });
  assert.equal(ok.status, 200);
});


test("asset deletion is blocked while a published revision references it", async () => {
  const { cms, boot, owner, assets } = await setup();
  const upload = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "used.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(upload.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({ sessionId: upload.session.id, token, mediaType: "image/png", body: new Uint8Array([1, 2]) });
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("image", { assetId: ready.id, alt: "used" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "uses-asset", title: "Uses asset", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });
  await assert.rejects(assets.deleteAsset(owner, ready.id), (error) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, "ASSET_IN_USE");
    assert.equal(error.details.references[0].path, "/uses-asset");
    return true;
  });
});

test("deleteAsset soft-deletes an unused ready asset", async () => {
  const { assets, boot, owner } = await setup();
  const created = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "orphan.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(created.uploadUrl).searchParams.get("token");
  const ready = await assets.uploadWithToken({
    sessionId: created.session.id,
    token,
    mediaType: "image/png",
    body: new Uint8Array([9]),
  });
  const deleted = await assets.deleteAsset(owner, ready.id);
  assert.ok(deleted.deletedAt);
  const listed = await assets.listAssets(owner, boot.workspaceId);
  assert.equal(listed.length, 0);
});
