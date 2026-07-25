import test from "node:test";
import assert from "node:assert/strict";
import {
  injectAdminViewBanner,
  shouldShowPublishedAdminBanner,
} from "../apps/public-renderer/dist/admin-view-banner.js";

test("injectAdminViewBanner marks draft and published HTML", () => {
  const base = "<!doctype html><html><head><title>記事</title></head><body><main>x</main></body></html>";
  const draft = injectAdminViewBanner(base, "draft", "rev_abc123456789");
  assert.match(draft, /下書きプレビュー（未公開）/);
  assert.match(draft, /<title>【下書き】記事<\/title>/);

  const published = injectAdminViewBanner(base, "published", "rev_abc123456789");
  assert.match(published, /公開済みページ/);
  assert.match(published, /<title>【公開】記事<\/title>/);
});

test("shouldShowPublishedAdminBanner respects query param", () => {
  assert.equal(shouldShowPublishedAdminBanner(new URL("https://x.test/p?baserAdminView=published")), true);
  assert.equal(shouldShowPublishedAdminBanner(new URL("https://x.test/p")), false);
});
