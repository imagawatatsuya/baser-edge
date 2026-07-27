import test from "node:test";
import assert from "node:assert/strict";
import { formatAssetDeleteError } from "../apps/admin-web/src/lib/formatAssetDeleteError.mjs";

test("formatAssetDeleteError maps ASSET_IN_USE to console copy", () => {
  const ja = formatAssetDeleteError(new Error("ASSET_IN_USE: Asset is used by published content"));
  assert.match(ja, /公開されている版/);
  assert.match(ja, /「公開」/);
  assert.equal(formatAssetDeleteError(new Error("used by published revision")), ja);
});

test("formatAssetDeleteError lists published paths from domainDetails", () => {
  const err = new Error("ASSET_IN_USE: Asset is used by published content");
  err.domainCode = "ASSET_IN_USE";
  err.domainDetails = {
    references: [{ path: "/news/hello" }, { path: "/news/hello" }, { path: "/about" }],
  };
  const msg = formatAssetDeleteError(err);
  assert.match(msg, /使用中:.*\/news\/hello/);
  assert.match(msg, /\/about/);
});

test("formatAssetDeleteError passes through other messages", () => {
  assert.equal(formatAssetDeleteError(new Error("network down")), "network down");
  assert.equal(formatAssetDeleteError("plain"), "plain");
});
