import { test } from "node:test";
import assert from "node:assert/strict";
import { mapConsoleUrlToAssetPath } from "../apps/api-worker/dist/index.js";

test("mapConsoleUrlToAssetPath preserves bundles and maps SPA routes to root index", () => {
  assert.equal(mapConsoleUrlToAssetPath("/console/"), "/");
  assert.equal(mapConsoleUrlToAssetPath("/console"), "/");
  assert.equal(mapConsoleUrlToAssetPath("/console/assets/index.js"), "/console/assets/index.js");
  assert.equal(mapConsoleUrlToAssetPath("/console/content/ci_1"), "/");
  assert.equal(mapConsoleUrlToAssetPath("/v1/health"), null);
});
