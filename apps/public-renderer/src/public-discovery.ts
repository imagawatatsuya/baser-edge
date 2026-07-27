import type { CmsService } from "@baser-edge/content-kernel";
import type { SiteId } from "@baser-edge/core-types";
import { buildAbsoluteCanonicalUrl } from "@baser-edge/renderer";

const SITEMAP_INDEXABLE_TYPES = new Set(["page", "blog", "article", "custom-content", "mail-form"]);

export function renderRobotsTxt(origin: string): string {
  const sitemap = buildAbsoluteCanonicalUrl(origin, "/sitemap.xml");
  return [
    "User-agent: *",
    "Disallow: /console/",
    "Disallow: /api/",
    "Disallow: /_preview/",
    "Disallow: /*/confirm",
    "Disallow: /*/submit",
    "",
    `Sitemap: ${sitemap}`,
    "",
  ].join("\n");
}

export async function renderSitemapXml(cms: CmsService, siteId: SiteId, origin: string): Promise<string> {
  const entries = await cms.store.listContentTree(siteId);
  const urls: Array<{ loc: string; lastmod: string }> = [];
  for (const entry of entries) {
    const snapshot = entry.snapshot;
    const item = snapshot.item;
    if (item.state !== "active" || !snapshot.publishedRevision) continue;
    if (snapshot.route.routeType !== "canonical" || !snapshot.route.isCanonical || !snapshot.route.active) continue;
    if (!SITEMAP_INDEXABLE_TYPES.has(item.contentTypeKey)) continue;
    const path = snapshot.route.path;
    if (path === "/" || path === "") continue;
    const loc = buildAbsoluteCanonicalUrl(origin, path);
    const lastmod = new Date(snapshot.publishedRevision.createdAt).toISOString();
    urls.push({ loc, lastmod });
  }
  urls.sort((a, b) => a.loc.localeCompare(b.loc));
  const body = urls
    .map((url) => `<url><loc>${escapeXml(url.loc)}</loc><lastmod>${escapeXml(url.lastmod)}</lastmod></url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
