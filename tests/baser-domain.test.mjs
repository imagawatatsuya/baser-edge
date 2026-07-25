import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@baser-edge/core-types";
import { buildSortKey, compareSortKeys, normalizeSlug } from "@baser-edge/baser-domain";

test("normalizeSlug accepts ASCII slugs and lowercases", () => {
  assert.equal(normalizeSlug("news"), "news");
  assert.equal(normalizeSlug("My-Post"), "my-post");
  assert.equal(normalizeSlug("  hello   world  "), "hello-world");
  assert.equal(normalizeSlug("-22"), "22");
  assert.equal(normalizeSlug("  -my-post-  "), "my-post");
});

test("compareSortKeys orders numeric prefixes", () => {
  assert.ok(compareSortKeys(buildSortKey(1, "a"), buildSortKey(2, "b")) < 0);
  assert.ok(compareSortKeys(buildSortKey(10, "a"), buildSortKey(2, "b")) > 0);
});

test("normalizeSlug rejects non-ASCII slugs", () => {
  assert.throws(() => normalizeSlug("あああ"), (error) => error instanceof DomainError && error.code === "INVALID_SLUG");
  assert.throws(() => normalizeSlug("news/子"), (error) => error instanceof DomainError && error.code === "INVALID_SLUG");
});
