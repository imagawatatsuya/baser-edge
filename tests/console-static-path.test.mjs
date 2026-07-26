import { test } from "node:test";
import assert from "node:assert/strict";
import { mapConsoleUrlToAssetPath } from "../apps/api-worker/dist/index.js";

test("mapConsoleUrlToAssetPath strips /console prefix for wrangler assets root", () => {
  assert.equal(mapConsoleUrlToAssetPath("/console/"), "/");
  assert.equal(mapConsoleUrlToAssetPath("/console"), "/");
  assert.equal(mapConsoleUrlToAssetPath("/console/assets/index.js"), "/assets/index.js");
  assert.equal(mapConsoleUrlToAssetPath("/v1/health"), null);
});
