import test from "node:test";
import assert from "node:assert/strict";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";

const cms = new CmsService(new MemoryCmsStore());
const worker = createApiWorker(() => cms);

test("GET /v1/console/capabilities without R2 reports memory storage", async () => {
  const response = await worker.fetch(new Request("https://api.test/v1/console/capabilities"), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.assetPublicDelivery, false);
  assert.equal(body.assetStorage, "memory");
  assert.equal(body.environment, "preview");
  assert.equal(body.instantLogin, false);
  assert.equal(body.publicSiteUrl, null);
});

test("GET /v1/console/capabilities with D1 inline storage enables public delivery", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/v1/console/capabilities"),
    { DB: {}, BASER_ASSET_STORAGE: "d1-inline" },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.assetPublicDelivery, true);
  assert.equal(body.assetStorage, "d1-inline");
  assert.equal(body.trialInlineMedia?.maxAssets, 3);
  assert.equal(body.trialInlineMedia?.maxBytesPerObject, 2 * 1024 * 1024);
});

test("GET /v1/console/capabilities with R2 binding enables public delivery flag", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/v1/console/capabilities"),
    { R2: {} },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.assetPublicDelivery, true);
  assert.equal(body.assetStorage, "r2");
});

test("POST /v1/console/capabilities is rejected", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/v1/console/capabilities", { method: "POST" }),
    {},
  );
  assert.equal(response.status, 405);
  const body = await response.json();
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
});

test("PATCH /v1/console/capabilities is rejected", async () => {
  const response = await worker.fetch(
    new Request("https://api.test/v1/console/capabilities", { method: "PATCH" }),
    {},
  );
  assert.equal(response.status, 405);
});
