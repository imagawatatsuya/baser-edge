import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import {
  AssetService,
  MemoryAssetMetadataStore,
  MemoryAssetObjectStore,
  TRIAL_INLINE_MEDIA_POLICY,
  TRIAL_INLINE_MAX_ASSETS,
} from "@baser-edge/asset-kernel";
import { D1CmsStore, D1AssetMetadataStore, D1AssetObjectStore } from "@baser-edge/cloudflare-adapters";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";

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
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

function migrate(db) {
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
}

function security(cms) {
  return {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms),
  };
}

/** Minimal valid PNG (1x1). */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function trialAssetService(shim, cms) {
  return new AssetService({
    metadata: new D1AssetMetadataStore(shim),
    objects: new D1AssetObjectStore(shim, TRIAL_INLINE_MEDIA_POLICY),
    security: security(cms),
    signingSecret: "trial-inline-asset-secret",
    trialInline: TRIAL_INLINE_MEDIA_POLICY,
    usageInspector: { listPublishedReferences: cms.store.listPublishedAssetReferences.bind(cms.store) },
  });
}

async function uploadPng(assets, owner, workspaceId, name = "shot.png") {
  const created = await assets.createUploadSession(owner, {
    workspaceId,
    filename: name,
    mediaType: "image/png",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(created.uploadUrl).searchParams.get("token");
  return assets.uploadWithToken({
    sessionId: created.session.id,
    token: token ?? "",
    mediaType: "image/png",
    body: PNG_1X1,
  });
}

test("trial inline rejects fourth upload with TRIAL_INLINE_ASSET_LIMIT", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const shim = new D1Shim(db);
  const cms = new CmsService(new D1CmsStore(shim));
  const boot = await cms.bootstrap({ workspaceName: "Trial", siteName: "Site", hostname: "trial.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const assets = await trialAssetService(shim, cms);
  for (let i = 0; i < TRIAL_INLINE_MAX_ASSETS; i += 1) {
    await uploadPng(assets, owner, boot.workspaceId, `a-${i}.png`);
  }
  await assert.rejects(
    () => uploadPng(assets, owner, boot.workspaceId, "one-too-many.png"),
    (error) => error instanceof DomainError && error.code === "TRIAL_INLINE_ASSET_LIMIT",
  );
  db.close();
});

test("trial inline rejects content-type mismatch on upload body", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const shim = new D1Shim(db);
  const cms = new CmsService(new D1CmsStore(shim));
  const boot = await cms.bootstrap({ workspaceName: "Trial", siteName: "Site", hostname: "sniff.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const assets = await trialAssetService(shim, cms);
  const created = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "fake.jpg",
    mediaType: "image/jpeg",
    uploadBaseUrl: "https://api.test",
  });
  const token = new URL(created.uploadUrl).searchParams.get("token");
  await assert.rejects(
    () => assets.uploadWithToken({
      sessionId: created.session.id,
      token: token ?? "",
      mediaType: "image/jpeg",
      body: PNG_1X1,
    }),
    (error) => error instanceof DomainError && error.code === "UPLOAD_CONTENT_MISMATCH",
  );
  db.close();
});

test("D1 inline blob is served from public worker /assets/:id", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const shim = new D1Shim(db);
  const cms = new CmsService(new D1CmsStore(shim));
  const boot = await cms.bootstrap({ workspaceName: "Trial", siteName: "Site", hostname: "pub.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const assets = await trialAssetService(shim, cms);
  const ready = await uploadPng(assets, owner, boot.workspaceId);
  const worker = createPublicWorker(() => cms, {
    resolveAssets: () => new AssetService({
      metadata: new D1AssetMetadataStore(shim),
      objects: new D1AssetObjectStore(shim, TRIAL_INLINE_MEDIA_POLICY),
      security: security(cms),
      signingSecret: "trial-inline-asset-secret",
      trialInline: TRIAL_INLINE_MEDIA_POLICY,
    }),
  });
  const response = await worker.fetch(new Request(`https://public.test/assets/${ready.id}`), {
    DB: shim,
    BASER_ASSET_STORAGE: "d1-inline",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length, PNG_1X1.length);
  db.close();
});

test("memory trial inline enforces asset limit", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({ workspaceName: "M", siteName: "S", hostname: "m.test", ownerName: "O" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const assets = new AssetService({
    metadata: new MemoryAssetMetadataStore(),
    objects: new MemoryAssetObjectStore(),
    security: security(cms),
    signingSecret: "trial-inline-asset-secret",
    trialInline: TRIAL_INLINE_MEDIA_POLICY,
  });
  for (let i = 0; i < TRIAL_INLINE_MAX_ASSETS; i += 1) {
    const created = await assets.createUploadSession(owner, {
      workspaceId: boot.workspaceId,
      filename: `x-${i}.png`,
      mediaType: "image/png",
      uploadBaseUrl: "https://api.test",
    });
    const token = new URL(created.uploadUrl).searchParams.get("token");
    await assets.uploadWithToken({
      sessionId: created.session.id,
      token: token ?? "",
      mediaType: "image/png",
      body: PNG_1X1,
    });
  }
  await assert.rejects(
    () => assets.createUploadSession(owner, {
      workspaceId: boot.workspaceId,
      filename: "overflow.png",
      mediaType: "image/png",
      uploadBaseUrl: "https://api.test",
    }),
    (error) => error instanceof DomainError && error.code === "TRIAL_INLINE_ASSET_LIMIT",
  );
});
