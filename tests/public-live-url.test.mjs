import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_VIEW_QUERY, buildPublicLiveUrl } from "@baser-edge/baser-domain";

test("buildPublicLiveUrl uses path only and optional published banner query", () => {
  const withBanner = buildPublicLiveUrl("https://site.test", "/news/hello");
  const url = new URL(withBanner);
  assert.equal(url.pathname, "/news/hello");
  assert.equal(url.searchParams.get(ADMIN_VIEW_QUERY), "published");
  assert.equal(url.searchParams.get("siteId"), null);
  assert.equal(url.searchParams.get("v"), null);

  const plain = buildPublicLiveUrl("https://site.test/", "about", { showPublishedBanner: false });
  assert.equal(plain, "https://site.test/about");
});
