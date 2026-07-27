import type { BlockNode, StructuredDocument } from "@baser-edge/structured-document";
import { escapeAttribute, escapeHtml } from "./escape.js";

export interface PageSeoInput {
  description: string;
  canonicalUrl: string;
  locale: string;
  preview?: boolean;
  openGraphType?: "website" | "article";
  datePublished?: string;
  dateModified?: string;
}

export function normalizePublicPath(path: string): string {
  if (!path || path === "/") return "/";
  const trimmed = path.replace(/\/+$/, "") || "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function buildAbsoluteCanonicalUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const normalized = normalizePublicPath(path);
  return normalized === "/" ? `${base}/` : `${base}${normalized}`;
}

export function trimMetaDescription(text: string, maxLength = 300): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function descriptionFromDocument(document: StructuredDocument): string {
  const parts: string[] = [];
  for (const block of flattenBlocks(document)) {
    if (block.type === "heading" && typeof block.props.text === "string") parts.push(block.props.text);
    if (block.type === "richText" && Array.isArray(block.props.paragraphs)) {
      for (const paragraph of block.props.paragraphs) {
        if (typeof paragraph === "string" && paragraph.trim()) parts.push(paragraph);
      }
    }
    if (block.type === "imageText" && typeof block.props.text === "string") parts.push(block.props.text);
  }
  return trimMetaDescription(parts.join(" "));
}

function flattenBlocks(document: StructuredDocument): BlockNode[] {
  return Object.values(document.root.slots).flat();
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderSeoHeadHtml(pageTitlePlain: string, seo: PageSeoInput): string {
  const description = trimMetaDescription(seo.description || pageTitlePlain);
  const robots = seo.preview
    ? "noindex, nofollow, noarchive"
    : "index, follow";
  const ogType = seo.openGraphType ?? "website";
  const lines: string[] = [
    `<meta name="description" content="${escapeAttribute(description)}">`,
    `<link rel="canonical" href="${escapeAttribute(seo.canonicalUrl)}">`,
    `<meta name="robots" content="${escapeAttribute(robots)}">`,
    `<meta property="og:title" content="${escapeAttribute(pageTitlePlain)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    `<meta property="og:url" content="${escapeAttribute(seo.canonicalUrl)}">`,
    `<meta property="og:type" content="${escapeAttribute(ogType)}">`,
    `<meta property="og:locale" content="${escapeAttribute(seo.locale)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeAttribute(pageTitlePlain)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
  ];
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ogType === "article" ? "Article" : "WebPage",
    name: pageTitlePlain,
    description,
    url: seo.canonicalUrl,
    inLanguage: seo.locale,
  };
  if (seo.datePublished) jsonLd.datePublished = seo.datePublished;
  if (seo.dateModified) jsonLd.dateModified = seo.dateModified;
  lines.push(`<script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`);
  return lines.join("\n");
}

export function extractTitleForSeo(title: string, siteName: string): string {
  if (!title && siteName) return siteName;
  if (!siteName || title === siteName) return title || siteName;
  return `${title} | ${siteName}`;
}
