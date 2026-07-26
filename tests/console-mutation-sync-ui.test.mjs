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
  const trashFn = source.indexOf("async function onTrash()");
  const trashBlock = source.slice(trashFn, source.indexOf("async function onUnpublish()"));
  assert.match(trashBlock, /await trashContent\(snapshot\)/);
  assert.match(trashBlock, /await reloadContentTree\(\)/);
  const trashAt = trashBlock.indexOf("await trashContent(snapshot)");
  const reloadAt = trashBlock.indexOf("await reloadContentTree()");
  const navigateAt = trashBlock.indexOf('navigate("/content")');
  assert.ok(reloadAt > trashAt, "reload must follow trashContent");
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

test("useContentTree reload invalidates tree cache only, not siteViewSync", () => {
  const hook = readAdmin("hooks/useContentTree.ts");
  assert.match(hook, /invalidateContentTreeCache/);
  assert.doesNotMatch(hook, /invalidateSiteContentViews/);
});

test("MailPage exposes manual submission reload", () => {
  const source = readAdmin("pages/MailPage.tsx");
  assert.match(source, /reloadSubmissions/);
  assert.match(source, /更新/);
});

test("siteViewSync invalidates content tree and media asset caches", () => {
  const source = readAdmin("lib/siteViewSync.ts");
  assert.match(source, /invalidateContentTreeCache/);
  assert.match(source, /invalidateMediaAssetsCache/);
});

test("AssetPickerModal loads assets via shared workspace media cache", () => {
  const modal = readAdmin("components/AssetPickerModal.tsx");
  assert.match(modal, /useWorkspaceMediaAssets/);
  const hook = readAdmin("hooks/useMediaAssets.ts");
  assert.match(hook, /fetchWorkspaceMediaAssets/);
  assert.match(hook, /invalidateMediaAssetsCache/);
});

test("contentTrash invalidates site content views after trash and restore", () => {
  const source = readAdmin("lib/contentTrash.ts");
  assert.match(source, /invalidateSiteContentViews/);
  const trashInvalidate = source.indexOf("invalidateSiteContentViews()", source.indexOf("export async function trashContent"));
  const restoreFn = source.indexOf("export async function restoreContent");
  const restoreInvalidate = source.indexOf("invalidateSiteContentViews()", restoreFn);
  assert.ok(trashInvalidate > 0 && trashInvalidate < restoreFn, "trashContent must invalidate site views");
  assert.ok(restoreInvalidate > restoreFn, "restoreContent must invalidate site views");
});

test("ContentEditPage reloads content tree after save, publish, and unpublish", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  assert.match(source, /await reloadContentTree\(\)/);
  const saveFn = source.indexOf("async function onSave()");
  const publishFn = source.indexOf("async function onPublish()");
  const unpublishFn = source.indexOf("async function onUnpublish()");
  assert.ok(source.indexOf("await reloadContentTree()", saveFn) > saveFn && source.indexOf("await reloadContentTree()", saveFn) < publishFn);
  assert.ok(source.indexOf("await reloadContentTree()", publishFn) > publishFn && source.indexOf("await reloadContentTree()", publishFn) < unpublishFn);
  assert.ok(source.indexOf("await reloadContentTree()", unpublishFn) > unpublishFn);
});

test("ContentEditPage reloads content tree after article-meta PATCH", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  const metaUrl = source.indexOf("/article-meta");
  assert.ok(metaUrl > 0, "article-meta PATCH expected");
  const metaBlock = source.slice(metaUrl, source.indexOf("<Field label=\"タイトル\""));
  assert.match(metaBlock, /method: "PATCH"/);
  assert.match(metaBlock, /toDatetimeLocalValue\(articleMeta\.postedAt\) === postedAtLocal/);
  assert.match(metaBlock, /await reloadContentTree\(\)/);
});

test("TrashPage reloads trash list after restore", () => {
  const source = readAdmin("pages/TrashPage.tsx");
  assert.match(source, /await restoreContent\(entry\.snapshot\)/);
  const restoreAt = source.indexOf("await restoreContent(entry.snapshot)");
  const reloadAt = source.indexOf("await reload()", restoreAt);
  assert.ok(reloadAt > restoreAt, "restore must be followed by trash list reload");
});

test("MediaLayout shares media assets via provider; library and upload use context", () => {
  const layout = readAdmin("pages/media/MediaLayout.tsx");
  assert.match(layout, /MediaAssetsProvider/);
  assert.match(layout, /useMediaAssets\(\)/);
  const library = readAdmin("pages/media/MediaLibraryPage.tsx");
  const upload = readAdmin("pages/media/MediaUploadPage.tsx");
  assert.match(library, /useMediaAssetsContext/);
  assert.match(upload, /useMediaAssetsContext/);
});

test("CustomEntriesLayout shares entries list; edit page reloads after mutations", () => {
  const layout = readAdmin("pages/CustomEntriesLayout.tsx");
  assert.match(layout, /CustomEntriesProvider/);
  const entries = readAdmin("pages/CustomEntryPages.tsx");
  assert.match(entries, /useCustomEntriesContext/);
  assert.match(entries, /await reloadEntries\(\)/);
  const saveFn = entries.indexOf("async function onSave()");
  const publishFn = entries.indexOf("async function onPublish()");
  const unpublishFn = entries.indexOf("async function onUnpublish()");
  assert.ok(entries.indexOf("await reloadEntries()", saveFn) > saveFn);
  assert.ok(entries.indexOf("await reloadEntries()", publishFn) > publishFn);
  assert.ok(entries.indexOf("await reloadEntries()", unpublishFn) > unpublishFn);
});

test("PluginsPage reloads activations after activate and deactivate", () => {
  const source = readAdmin("pages/PluginsPage.tsx");
  assert.match(source, /async function loadActivations/);
  const activateFn = source.indexOf("async function activate(");
  const deactivateFn = source.indexOf("async function deactivate(");
  assert.ok(source.indexOf("await loadActivations()", activateFn) > activateFn);
  assert.ok(source.indexOf("await loadActivations()", deactivateFn) > deactivateFn);
});

test("ActivationsPage reloads active theme after activate", () => {
  const source = readAdmin("pages/ActivationsPage.tsx");
  assert.match(source, /loadActiveTheme/);
  assert.match(source, /\/v1\/sites\/\$\{session\.siteId\}\/theme/);
  assert.match(source, /activeSummary/);
  const activateFn = source.indexOf("async function activate(");
  assert.ok(source.indexOf("applyActiveTheme(activated)", activateFn) > activateFn);
  assert.match(source, /activeReleaseId/);
});
