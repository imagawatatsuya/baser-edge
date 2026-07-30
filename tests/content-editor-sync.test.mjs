import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "admin-web", "src");

function readAdmin(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("contentEditorSync treats published draft mismatch as navigation block", () => {
  const source = readAdmin("lib/contentEditorSync.ts");
  assert.match(source, /differsFromPublished/);
  assert.match(source, /liveSiteOutOfSync/);
  assert.match(source, /shouldBlockNavigation/);
});

test("live site stale ack phrase is fixed for draft-only paths", () => {
  const source = readAdmin("lib/contentEditorSync.ts");
  assert.match(source, /本番は更新しない/);
  const modal = readAdmin("components/DraftOnlySaveModal.tsx");
  assert.match(modal, /LIVE_SITE_STALE_ACK_PHRASE/);
});

test("ContentEditPage blocks leave when live site is out of sync", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  assert.match(source, /useEditorLeaveGuard/);
  assert.match(source, /differsFromPublished|shouldBlockNavigation/);
  assert.match(source, /cancelBlockedNavigation|proceedLeave/);
  assert.match(source, /editor-live-stale-banner/);
  assert.match(source, /サイトに反映/);
  assert.match(source, /EditorLeaveDialog/);
});

test("ContentEditPage explains the public cache propagation delay before and after publish", () => {
  const source = readAdmin("pages/ContentEditPage.tsx");
  const css = readAdmin("layout/admin.css");
  assert.match(source, /公開処理が完了しました。訪問者向けページはキャッシュのため、反映まで1分程度かかる場合があります。/);
  assert.match(source, /className="editor-publication-delay-notice" role="note"/);
  assert.match(source, /公開ページへの反映について/);
  assert.match(source, /公開直後の内容は「公開を確認（バナー付き）」で確認できます。/);
  assert.match(css, /\.editor-publication-delay-notice/);
});

test("CustomEntryEditPage blocks leave when live site is out of sync", () => {
  const source = readAdmin("pages/CustomEntryPages.tsx");
  assert.match(source, /useEditorLeaveGuard/);
  assert.match(source, /computeCustomEntrySyncState/);
  assert.match(source, /サイトに反映/);
});

test("browser smoke covers content and custom entry editor routes", () => {
  const smoke = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "admin-console-browser-smoke.test.mjs"),
    "utf8",
  );
  assert.match(smoke, /console\/content/);
  assert.match(smoke, /console\/custom/);
});

test("LiveSiteOutOfSyncPage lists stale content and custom entries", () => {
  const source = readAdmin("pages/LiveSiteOutOfSyncPage.tsx");
  assert.match(source, /isContentTreeEntryLiveOutOfSync/);
  assert.match(source, /isCustomEntryLiveOutOfSync/);
});

test("admin console uses data router for useBlocker", () => {
  const main = readAdmin("main.tsx");
  const router = readAdmin("router.tsx");
  assert.match(main, /RouterProvider/);
  assert.match(main, /ConsoleErrorBoundary/);
  assert.match(router, /createBrowserRouter/);
});
