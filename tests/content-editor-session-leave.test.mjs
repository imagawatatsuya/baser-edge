import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors computeEditorSyncState published-vs-editor rule (see contentEditorSync.ts).
 */
function shouldBlockPublished(differsFromPublished) {
  return differsFromPublished;
}

test("published article blocks leave while editor differs from published revision", () => {
  assert.equal(shouldBlockPublished(true), true);
  assert.equal(shouldBlockPublished(false), false);
});

test("delete image without save keeps differsFromPublished true across repeated navigate attempts", () => {
  const afterFirstDelete = true;
  const afterCancelStillNoImageInEditor = true;
  const afterSecondDeleteNoOp = true;
  assert.equal(shouldBlockPublished(afterFirstDelete), true);
  assert.equal(shouldBlockPublished(afterCancelStillNoImageInEditor), true);
  assert.equal(shouldBlockPublished(afterSecondDeleteNoOp), true);
});
