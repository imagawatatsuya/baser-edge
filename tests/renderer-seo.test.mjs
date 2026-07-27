import assert from "node:assert/strict";
import test from "node:test";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import {
  buildAbsoluteCanonicalUrl,
  descriptionFromDocument,
  renderPage,
  renderSeoHeadHtml,
  serializeJsonLd,
} from "@baser-edge/renderer";

test("renderSeoHeadHtml escapes description and canonical", () => {
  const html = renderSeoHeadHtml("Page title", {
    description: `quotes and <html> tags`,
    canonicalUrl: "https://site.test/home",
    locale: "ja",
  });
  assert.match(html, /meta name="description" content="quotes and &lt;html&gt; tags"/);
  assert.match(html, /link rel="canonical" href="https:\/\/site\.test\/home"/);
  assert.match(html, /meta name="robots" content="index, follow"/);
});

test("preview seo uses noindex robots meta", () => {
  const html = renderSeoHeadHtml("Draft", {
    description: "Draft body",
    canonicalUrl: "https://site.test/preview",
    locale: "ja",
    preview: true,
  });
  assert.match(html, /meta name="robots" content="noindex, nofollow, noarchive"/);
});

test("JSON-LD serialization cannot break script element", () => {
  const raw = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.ok(!raw.includes("</script>"));
  assert.ok(raw.includes("\\u003c"));
});

test("renderPage includes canonical and description for public page", () => {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("richText", { paragraphs: ["本文の説明"] }));
  const html = renderPage(document, undefined, {
    title: "ホーム",
    siteName: "テストサイト",
    lang: "ja",
    seo: {
      description: "本文の説明",
      canonicalUrl: "https://example.test/home",
      locale: "ja",
    },
  });
  assert.match(html, /rel="canonical" href="https:\/\/example\.test\/home"/);
  assert.match(html, /meta name="description"/);
  assert.match(html, /application\/ld\+json/);
});

test("starter hero image is not lazy-loaded", () => {
  const document = createEmptyDocument();
  const hero = createBlock("image", { assetId: "builtin:starter-home-hero", alt: "" });
  hero.id = "starter-home-hero";
  document.root.slots.body.push(hero);
  const html = renderPage(document, undefined, { title: "Home" });
  assert.match(html, /starter-home-hero/);
  assert.ok(!html.includes("loading=\"lazy\""));
});

test("second image in document uses lazy loading", () => {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("image", { assetId: "asset-1", alt: "one" }));
  document.root.slots.body.push(createBlock("image", { assetId: "asset-2", alt: "two" }));
  const html = renderPage(document, undefined, { title: "Home" });
  const lazyCount = (html.match(/loading="lazy"/g) ?? []).length;
  assert.equal(lazyCount, 1);
});

test("descriptionFromDocument collects heading and rich text", () => {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 2, text: "見出し" }));
  document.root.slots.body.push(createBlock("richText", { paragraphs: ["段落"] }));
  assert.equal(descriptionFromDocument(document), "見出し 段落");
});

test("buildAbsoluteCanonicalUrl normalizes paths", () => {
  assert.equal(buildAbsoluteCanonicalUrl("https://host.test", "/home"), "https://host.test/home");
  assert.equal(buildAbsoluteCanonicalUrl("https://host.test/", "home"), "https://host.test/home");
});
