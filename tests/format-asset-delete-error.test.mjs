import test from "node:test";
import assert from "node:assert/strict";
import { formatAssetDeleteError } from "../apps/admin-web/src/lib/formatAssetDeleteError.mjs";

test("formatAssetDeleteError maps ASSET_IN_USE to console copy", () => {
  const ja = formatAssetDeleteError(new Error("ASSET_IN_USE: Asset is used by published content"));
  assert.match(ja, /公開中のページや記事で使われているため削除できません/);
  assert.equal(formatAssetDeleteError(new Error("used by published revision")), ja);
});

test("formatAssetDeleteError passes through other messages", () => {
  assert.equal(formatAssetDeleteError(new Error("network down")), "network down");
  assert.equal(formatAssetDeleteError("plain"), "plain");
});
