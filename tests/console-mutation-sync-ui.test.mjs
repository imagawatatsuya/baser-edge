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

test("ContentLayout tree row navigates without row-level draggable", () => {
  const layout = readAdmin("pages/ContentLayout.tsx");
  assert.match(layout, /className="tree-drag-handle"[\s\S]*?draggable/);
  assert.match(layout, /navigate\(`\/content\/\$\{id\}`\)/);
  assert.match(layout, /prefetchContentEditor/);
  assert.doesNotMatch(layout, /className=\{`tree-row[\s\S]*?`\}\s*\n\s*draggable/);
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
  assert.match(source, /invalidateContentEditorCache/);
});

test("console GET cache deduplicates reads and is cleared on auth expiry", () => {
  const cache = readAdmin("lib/consoleQueryCache.ts");
  assert.match(cache, /const inflight = new Map/);
  assert.match(cache, /if \(pending\) return pending as Promise<T>/);
  assert.match(cache, /fresh\?: boolean/);
  assert.match(cache, /invalidateConsoleQuery/);
  const client = readAdmin("api/client.ts");
  const failAuth = client.slice(client.indexOf("function failAuth()"), client.indexOf("export function syncCsrfFromCookies"));
  assert.match(failAuth, /invalidateConsoleQuery\(\)/);
});

test("console capabilities share one cached request across mounted surfaces", () => {
  const hook = readAdmin("hooks/useConsoleCapabilities.ts");
  assert.match(hook, /loadConsoleQuery/);
  assert.match(hook, /peekConsoleQuery/);
  assert.match(hook, /CAPABILITIES_MAX_AGE_MS/);
  assert.match(hook, /fresh: refreshKey > 0/);
});

test("LiveSiteOutOfSync reuses the content tree and parallelizes custom reads", () => {
  const source = readAdmin("pages/LiveSiteOutOfSyncPage.tsx");
  assert.match(source, /peekContentTreeCache/);
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /Promise\.all\(defs\.map/);
  assert.doesNotMatch(source, /for \(const def of defs\)/);
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
  assert.match(source, /syncEditorFromSnapshot\(publishedSnap\)/);
  assert.match(source, /syncEditorFromSnapshot\(unpublished\)/);
  assert.match(source, /await reloadContentTree\(\)/);
  assert.match(source, /async function onSave\(\)[\s\S]*await reloadContentTree\(\)/);
  assert.match(source, /async function onSaveDraftOnly\(\)[\s\S]*await reloadContentTree\(\)/);
  assert.match(source, /async function publishLiveWorkflow\(\)[\s\S]*await reloadContentTree\(\)/);
  assert.match(source, /async function onUnpublish\(\)[\s\S]*await reloadContentTree\(\)/);
  assert.doesNotMatch(source, /entries\.find/);
});

test("contentSnapshotCache invalidation clears inflight editor fetches", () => {
  const source = readAdmin("lib/contentSnapshotCache.ts");
  assert.match(source, /inflightById\.delete/);
  assert.match(source, /fresh\?: boolean/);
});

test("ContentEditPage updates article metadata locally without reloading the content tree", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  assert.match(source, /\/article-meta`[\s\S]*method: "PATCH"/);
  assert.match(source, /toDatetimeLocalValue\(articleMeta\.postedAt\) === postedAtLocal/);
  const patchAt = source.indexOf("/article-meta`");
  const patchBlock = source.slice(patchAt, source.indexOf("</Field>", patchAt));
  assert.doesNotMatch(patchBlock, /reloadContentTree/);
});

test("editor reads one aggregated endpoint and opens a pending preview tab synchronously", () => {
  const cache = readAdmin("lib/contentSnapshotCache.ts");
  assert.match(cache, /\/v1\/content\/\$\{encodeURIComponent\(contentId\)\}\/editor/);
  assert.doesNotMatch(cache, /Promise\.all/);
  const source = readAdmin("pages/ContentEditPage.tsx");
  const previewAt = source.indexOf("async function onPreviewDraft()");
  const previewBlock = source.slice(previewAt, source.indexOf("async function onPublish()", previewAt));
  const openAt = previewBlock.indexOf('openNamedBrowserTab("about:blank"');
  const requestAt = previewBlock.indexOf("/previews`");
  assert.ok(openAt >= 0 && openAt < requestAt, "pending tab must open before preview network work");
  assert.match(previewBlock, /location\.replace\(result\.previewUrl\)/);
});

test("ContentLayout applies reorder results locally instead of reloading the full tree", () => {
  const source = readAdmin("pages/ContentLayout.tsx");
  const reorderAt = source.indexOf("async function reorderEntry(");
  const reorderBlock = source.slice(reorderAt, source.indexOf("async function moveEntryUp", reorderAt));
  assert.match(reorderBlock, /applyReorderToContentTree/);
  assert.match(reorderBlock, /updateEntries/);
  assert.doesNotMatch(reorderBlock, /reload\(\)/);
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

test("media thumbnails use derivatives, upload-time generation, and above-fold priority", () => {
  const component = readAdmin("components/AssetThumbnail.tsx");
  const url = readAdmin("lib/assetUrl.ts");
  const upload = readAdmin("pages/media/MediaUploadPage.tsx");
  const library = readAdmin("pages/media/MediaLibraryPage.tsx");
  assert.match(url, /\/thumbnail/);
  assert.match(component, /consoleAssetThumbnailUrl/);
  assert.match(component, /ensureAssetThumbnailFromImage/);
  assert.match(component, /fetchPriority/);
  assert.match(upload, /createAssetThumbnail/);
  assert.match(upload, /persistAssetThumbnail/);
  assert.match(library, /eager=\{index < 12\}/);
});

test("CustomEntriesLayout shares entries list; edit page reloads after mutations", () => {
  const layout = readAdmin("pages/CustomEntriesLayout.tsx");
  assert.match(layout, /CustomEntriesProvider/);
  const entries = readAdmin("pages/CustomEntryPages.tsx");
  assert.match(entries, /useCustomEntriesContext/);
  assert.match(entries, /await reloadEntries\(\)/);
  const saveFn = entries.indexOf("async function onSave()");
  const publishFn = entries.indexOf("async function publishLiveWorkflow()");
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
  assert.ok(source.indexOf("invalidateConsoleQuery", activateFn) > activateFn);
  assert.ok(source.indexOf("invalidateConsoleQuery", deactivateFn) > deactivateFn);
});

test("ActivationsPage reloads active theme after activate", () => {
  const source = readAdmin("pages/ActivationsPage.tsx");
  assert.match(source, /loadActiveTheme/);
  assert.match(source, /\/v1\/sites\/\$\{session\.siteId\}\/theme/);
  assert.match(source, /activeSummary/);
  const activateFn = source.indexOf("async function activate(");
  assert.ok(source.indexOf("applyActiveTheme(activated)", activateFn) > activateFn);
  assert.ok(source.indexOf("setConsoleQuery", activateFn) > activateFn);
  assert.match(source, /activeReleaseId/);
});

test("ContentPage and TreeModals gate create flows on validateSlugInput", () => {
  const contentPage = readAdmin("pages/ContentPage.tsx");
  assert.match(contentPage, /validateSlugInput\(slug\)/);
  assert.match(contentPage, /SLUG_FIELD_HINT/);
  const treeModals = readAdmin("components/tree/TreeModals.tsx");
  assert.match(treeModals, /validateSlugInput\(slug\)/);
  assert.match(treeModals, /validateSlugInput\(newSlug\)/);
});

test("public renderer imports ADMIN_VIEW_QUERY from baser-domain", () => {
  const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
  const source = readFileSync(join(repoRoot, "apps/public-renderer/src/admin-view-banner.ts"), "utf8");
  assert.match(source, /@baser-edge\/baser-domain/);
  assert.match(source, /ADMIN_VIEW_QUERY/);
});

test("ContentEditPage opens public live URLs without siteId or revision query params", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  assert.match(source, /buildPublicLiveUrl\(resolvePublicSiteOrigin\(session\), data\.route\.path, \{ showPublishedBanner \}\)/);
  assert.match(source, /訪問者と同じ表示/);
  assert.match(source, /PUBLIC_VISITOR_TAB/);
});

test("buildPublicLiveUrl in baser-domain documents SITE_ID binding (no siteId in query)", () => {
  const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
  const source = readFileSync(join(repoRoot, "packages/baser-domain/src/public-live-url.ts"), "utf8");
  assert.match(source, /SITE_ID/);
  assert.doesNotMatch(source, /searchParams\.set\("siteId"/);
});

test("admin slug helper stays aligned with baser-domain normalizeSlug", () => {
  const slugLib = readAdmin("lib/slug.ts");
  assert.match(slugLib, /Matches server `normalizeSlug`/);
  assert.match(slugLib, /\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$/);
});
