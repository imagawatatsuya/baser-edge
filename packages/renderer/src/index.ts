import type { BlockNode, StructuredDocument } from "@baser-edge/structured-document";
import type { ContentRevision } from "@baser-edge/content-kernel";
import { builtinTheme, compileThemeCss, type ResolvedThemePresentation } from "@baser-edge/theme-kernel";

export interface RenderResolver {
  assetUrl(assetId: string): string | null;
  contentUrl(contentId: string): string | null;
}

export interface RenderOptions {
  now?: Date;
  preview?: boolean;
  title?: string;
  revision?: ContentRevision;
  theme?: ResolvedThemePresentation;
  siteName?: string;
  lang?: string;
  headHtml?: string;
  bodyAttributes?: Record<string, string>;
}

export interface RenderShellOptions {
  title: string;
  bodyHtml: string;
  theme?: ResolvedThemePresentation;
  siteName?: string;
  lang?: string;
  headHtml?: string;
  bodyAttributes?: Record<string, string>;
}

const defaultResolver: RenderResolver = {
  assetUrl: (assetId) => `/assets/${encodeURIComponent(assetId)}`,
  contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`,
};

export function renderDocument(
  document: StructuredDocument,
  resolver: RenderResolver = defaultResolver,
  options: RenderOptions = {},
): string {
  const now = options.now ?? new Date();
  return Object.values(document.root.slots)
    .flat()
    .map((block) => renderBlock(block, resolver, now, options.preview ?? false))
    .join("\n");
}

export function renderPage(
  document: StructuredDocument,
  resolver: RenderResolver = defaultResolver,
  options: RenderOptions = {},
): string {
  const revision = options.revision?.id ?? "unknown";
  const theme = options.theme ?? builtinTheme();
  const mainClass = theme.layoutRevision.layout.mainClass;
  const body = `<main class="${escapeAttribute(mainClass)}">${renderDocument(document, resolver, options)}</main>`;
  const bodyAttributes = { "data-content-revision": revision, "data-theme-release": theme.release.id, ...(options.bodyAttributes ?? {}) };
  return renderShell({
    title: options.title ?? "",
    bodyHtml: body,
    theme,
    ...(options.siteName !== undefined ? { siteName: options.siteName } : {}),
    ...(options.lang !== undefined ? { lang: options.lang } : {}),
    ...(options.headHtml !== undefined ? { headHtml: options.headHtml } : {}),
    bodyAttributes,
  });
}

export function renderShell(options: RenderShellOptions): string {
  const theme = options.theme ?? builtinTheme();
  const layout = theme.layoutRevision.layout;
  const siteName = options.siteName ?? "";
  const title = escapeHtml(options.title);
  const pageTitle = siteName && options.title && siteName !== options.title ? `${title} | ${escapeHtml(siteName)}` : title || escapeHtml(siteName);
  const header = layout.header === "none" ? "" : `<header class="bc-site-header"><div class="bc-shell">${layout.showSiteName && siteName ? `<a class="bc-site-brand" href="/">${escapeHtml(siteName)}</a>` : ""}</div></header>`;
  const footerText = layout.footerText || siteName;
  const footer = layout.footer === "none" ? "" : `<footer class="bc-site-footer"><div class="bc-shell">${escapeHtml(footerText)}</div></footer>`;
  const attrs = Object.entries(options.bodyAttributes ?? {}).map(([key,value])=>` ${escapeAttributeName(key)}="${escapeAttribute(value)}"`).join("");
  return `<!doctype html>
<html lang="${escapeAttribute(options.lang ?? "ja")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle}</title>
<style>${baseCss}\n${compileThemeCss(theme)}</style>
${options.headHtml ?? ""}
</head>
<body${attrs}>
${header}
${options.bodyHtml}
${footer}
</body>
</html>`;
}

function renderBlock(block: BlockNode, resolver: RenderResolver, now: Date, preview: boolean): string {
  if (!isVisible(block, now)) return "";
  const id = escapeAttribute(block.id);
  switch (block.type) {
    case "heading": {
      const level = asInt(block.props.level, 2, 1, 6);
      return `<h${level} data-block-id="${id}">${escapeHtml(asString(block.props.text))}</h${level}>`;
    }
    case "richText": {
      const paragraphs = Array.isArray(block.props.paragraphs) ? block.props.paragraphs : [];
      return `<section data-block-id="${id}" class="bc-rich-text">${paragraphs.map((value) => `<p>${escapeHtml(String(value))}</p>`).join("")}</section>`;
    }
    case "image": {
      const assetId = asString(block.props.assetId);
      const src = resolver.assetUrl(assetId);
      if (!src) return preview ? unsupported(block, "Asset is unavailable") : "";
      const heroClass = block.id === "starter-home-hero" ? " bc-starter-hero" : "";
      return `<figure data-block-id="${id}" class="bc-figure-image${heroClass}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(asString(block.props.alt))}" loading="lazy" decoding="async"></figure>`;
    }
    case "imageText": {
      const assetId = asString(block.props.assetId);
      const src = resolver.assetUrl(assetId);
      if (!src) return preview ? unsupported(block, "Asset is unavailable") : "";
      return `<section data-block-id="${id}" class="bc-image-text"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(asString(block.props.alt))}" loading="lazy"><p>${escapeHtml(asString(block.props.text))}</p></section>`;
    }
    case "gallery": {
      const ids = Array.isArray(block.props.assetIds) ? block.props.assetIds.map(String) : [];
      return `<section data-block-id="${id}" class="bc-gallery">${ids.map((assetId) => {
        const src = resolver.assetUrl(assetId);
        return src ? `<img src="${escapeAttribute(src)}" alt="" loading="lazy">` : "";
      }).join("")}</section>`;
    }
    case "callToAction": {
      const target = resolver.contentUrl(asString(block.props.targetContentId));
      if (!target) return preview ? unsupported(block, "Target content is unavailable") : "";
      return `<p data-block-id="${id}" class="bc-cta"><a href="${escapeAttribute(target)}">${escapeHtml(asString(block.props.label))}</a></p>`;
    }
    case "table": {
      const rows = Array.isArray(block.props.rows) ? block.props.rows : [];
      return `<div data-block-id="${id}" class="bc-table-wrap"><table><tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    case "fileDownload": {
      const url = resolver.assetUrl(asString(block.props.assetId));
      if (!url) return preview ? unsupported(block, "File is unavailable") : "";
      return `<p data-block-id="${id}"><a href="${escapeAttribute(url)}" download>${escapeHtml(asString(block.props.label))}</a></p>`;
    }
    case "safeEmbed": {
      const safeUrl = validateEmbed(asString(block.props.provider), asString(block.props.url));
      if (!safeUrl) return preview ? unsupported(block, "Embed URL is not allowed") : "";
      return `<div data-block-id="${id}" class="bc-embed"><iframe src="${escapeAttribute(safeUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
    }
    case "divider":
      return `<hr data-block-id="${id}">`;
    default:
      return preview ? unsupported(block, `Unsupported component: ${block.type}@${block.componentVersion}`) : `<!-- unsupported component ${escapeComment(block.type)} -->`;
  }
}

function isVisible(block: BlockNode, now: Date): boolean {
  const from = block.visibility?.publishAt ? Date.parse(block.visibility.publishAt) : null;
  const until = block.visibility?.unpublishAt ? Date.parse(block.visibility.unpublishAt) : null;
  const timestamp = now.getTime();
  return (from === null || Number.isNaN(from) || timestamp >= from) && (until === null || Number.isNaN(until) || timestamp < until);
}

function validateEmbed(provider: string, rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    const allowed: Record<string, string[]> = {
      youtube: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
      vimeo: ["player.vimeo.com"],
      maps: ["www.google.com", "maps.google.com"],
    };
    return allowed[provider]?.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function unsupported(block: BlockNode, message: string): string {
  return `<aside data-block-id="${escapeAttribute(block.id)}" class="bc-unsupported">${escapeHtml(message)}</aside>`;
}

function asString(value: unknown): string { return typeof value === "string" ? value : ""; }
function asInt(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function escapeAttribute(value: string): string { return escapeHtml(value).replace(/`/g, "&#96;"); }
function escapeAttributeName(value:string):string{return /^[a-zA-Z_:][a-zA-Z0-9:_.-]*$/.test(value)?value:"data-invalid";}
function escapeComment(value: string): string { return value.replace(/--/g, "—"); }

const baseCss = `
*{box-sizing:border-box}
:root{font-family:var(--bc-font,system-ui,sans-serif);font-size:var(--bc-font-size,16px);color:var(--bc-text,#1d1d1f);background:var(--bc-bg,#fff);line-height:var(--bc-line-height,1.7)}
body{margin:0;background:var(--bc-bg);color:var(--bc-text)}a{color:var(--bc-accent);text-underline-offset:.16em}.bc-shell,.bc-page{width:min(calc(100% - 2rem),var(--bc-content-max,72rem));margin-inline:auto}.bc-page{padding-block:calc(2rem * var(--bc-space-scale,1))}
.bc-site-header,.bc-site-footer{background:var(--bc-surface);border-color:var(--bc-border);border-style:solid;border-width:0}.bc-site-header{border-bottom-width:1px}.bc-site-footer{border-top-width:1px;margin-top:3rem;color:var(--bc-muted)}.bc-site-header .bc-shell,.bc-site-footer .bc-shell{padding-block:1rem}.bc-site-brand{font-weight:800;color:var(--bc-text);text-decoration:none}
img{max-width:100%;height:auto}.bc-figure-image.bc-starter-hero{margin:1.5rem 0}.bc-starter-hero img{width:100%;max-width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--bc-radius,.5rem);height:auto}.bc-image-text{display:grid;gap:1rem;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.bc-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}.bc-cta a{display:inline-block;padding:.75rem 1rem;border:1px solid currentColor;border-radius:var(--bc-radius,.5rem)}.bc-table-wrap{overflow:auto}.bc-embed iframe{width:100%;aspect-ratio:16/9;border:0}.bc-unsupported{padding:1rem;border:1px dashed currentColor}.bc-list{display:grid;gap:1rem}.bc-card{border:1px solid var(--bc-border);border-radius:var(--bc-radius);padding:1rem;background:var(--bc-surface)}
@media(max-width:640px){.bc-image-text{grid-template-columns:1fr}}
`;
