/**
 * Console read-your-writes: critical UI paths must reload shared list/tree state after mutations.
 * See .cursor/rules/console-mutation-sync.mdc
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const adminRoot = join(fileURLToPath(new URL("..", import.meta.url)), "apps/admin-web/src");

function readAdmin(relPath) {
  return readFileSync(join(adminRoot, relPath), "utf8");
}

test("ContentEditPage reloads content tree after trash before navigate", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  assert.match(source, /useContentTreeContext/);
  assert.match(source, /await trashContent\(snapshot\)/);
  assert.match(source, /await reloadContentTree\(\)/);
  const trashAt = source.indexOf("await trashContent(snapshot)");
  const reloadAt = source.indexOf("await reloadContentTree()");
  const navigateAt = source.indexOf('navigate("/content")');
  assert.ok(trashAt >= 0 && reloadAt > trashAt, "reload must follow trashContent");
  assert.ok(navigateAt > reloadAt, "navigate must follow tree reload");
});

test("ContentLayout shares tree state and reloads after tree-menu trash", () => {
  const layout = readAdmin("pages/ContentLayout.tsx");
  assert.match(layout, /ContentTreeProvider/);
  assert.match(layout, /await trashContent\(entry\.snapshot\)/);
  const trashCall = layout.indexOf("await trashContent(entry.snapshot)");
  const reloadAfterTrash = layout.indexOf("await reload()", trashCall);
  assert.ok(reloadAfterTrash > trashCall, "tree row trash must await reload()");
});

test("useContentTree exposes context for child routes", () => {
  const hook = readAdmin("hooks/useContentTree.ts");
  assert.match(hook, /ContentTreeProvider/);
  assert.match(hook, /useContentTreeContext/);
  assert.match(hook, /invalidateContentTreeCache/);
});

test("contentTrash invalidates content tree cache after trash and restore", () => {
  const source = readAdmin("lib/contentTrash.ts");
  assert.match(source, /invalidateContentTreeCache/);
  const trashInvalidate = source.indexOf("invalidateContentTreeCache()", source.indexOf("export async function trashContent"));
  const restoreFn = source.indexOf("export async function restoreContent");
  const restoreInvalidate = source.indexOf("invalidateContentTreeCache()", restoreFn);
  assert.ok(trashInvalidate > 0 && trashInvalidate < restoreFn, "trashContent must invalidate tree cache");
  assert.ok(restoreInvalidate > restoreFn, "restoreContent must invalidate tree cache");
});

test("TrashPage reloads trash list after restore", () => {
  const source = readAdmin("pages/TrashPage.tsx");
  assert.match(source, /await restoreContent\(entry\.snapshot\)/);
  const restoreAt = source.indexOf("await restoreContent(entry.snapshot)");
  const reloadAt = source.indexOf("await reload()", restoreAt);
  assert.ok(reloadAt > restoreAt, "restore must be followed by trash list reload");
});
