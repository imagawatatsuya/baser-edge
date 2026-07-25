import { randomUUID } from "node:crypto";

/**
 * Conservative BurgerEditor HTML importer.
 * It intentionally preserves unknown blocks as legacyBurgerBlock instead of
 * silently guessing or discarding their behavior.
 */
export function importBurgerEditorHtml(html) {
  const sourceBlocks = extractTopLevelBurgerBlocks(html);
  const warnings = [];
  const blocks = sourceBlocks.map(({ type, rawHtml }, index) => {
    const id = `blk_migration_${randomUUID()}`;
    const common = { id, componentVersion: 1, slots: {}, provenance: { source: "migration", sourceId: `burger:${index}` } };
    if (type === "title-h2" || type === "title-h3") {
      return { ...common, type: "heading", props: { level: type === "title-h2" ? 2 : 3, text: textContent(rawHtml) } };
    }
    if (type === "hr") return { ...common, type: "divider", props: {} };
    if (/^image[1-5]$/.test(type)) {
      const sources = [...rawHtml.matchAll(/<img\b[^>]*\bsrc=(['"])(.*?)\1/gi)].map((match) => match[2]);
      warnings.push(...sources.map((source) => ({ code: "LEGACY_ASSET_PATH", blockType: type, value: source })));
      return { ...common, type: "gallery", props: { assetIds: sources.map((source) => `legacy-path:${source}`) } };
    }
    if (type === "youtube") {
      const src = rawHtml.match(/<iframe\b[^>]*\bsrc=(['"])(.*?)\1/i)?.[2];
      if (src) return { ...common, type: "safeEmbed", props: { provider: "youtube", url: src } };
    }
    warnings.push({ code: "UNMAPPED_BURGER_BLOCK", blockType: type, index });
    return { ...common, type: "legacyBurgerBlock", props: { burgerType: type, rawHtml } };
  });

  if (sourceBlocks.length === 0 && html.trim()) {
    warnings.push({ code: "NO_BURGER_BLOCKS", message: "The input contained HTML but no data-bgb blocks." });
    blocks.push({
      id: `blk_migration_${randomUUID()}`,
      type: "legacyBurgerBlock",
      componentVersion: 1,
      props: { burgerType: "unknown", rawHtml: html },
      slots: {},
      provenance: { source: "migration", sourceId: "burger:raw" },
    });
  }

  return {
    document: {
      formatVersion: 1,
      root: { id: "root", type: "page", componentVersion: 1, props: {}, slots: { body: blocks } },
    },
    report: { sourceBlockCount: sourceBlocks.length, outputBlockCount: blocks.length, warnings },
  };
}

export function extractTopLevelBurgerBlocks(html) {
  const blocks = [];
  let cursor = 0;
  while (cursor < html.length) {
    const open = /<([a-zA-Z][\w:-]*)\b([^>]*\bdata-bgb=(['"])(.*?)\3[^>]*)>/gi;
    open.lastIndex = cursor;
    const match = open.exec(html);
    if (!match) break;
    const tag = match[1].toLowerCase();
    const type = match[4];
    const start = match.index;
    const end = findMatchingTagEnd(html, tag, open.lastIndex);
    if (end < 0) {
      blocks.push({ type, rawHtml: html.slice(start) });
      break;
    }
    blocks.push({ type, rawHtml: html.slice(start, end) });
    cursor = end;
  }
  return blocks;
}

function findMatchingTagEnd(html, tag, from) {
  const token = new RegExp(`<\\/?${escapeRegExp(tag)}\\b[^>]*>`, "gi");
  token.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = token.exec(html))) {
    const value = match[0];
    if (value.startsWith("</")) depth -= 1;
    else if (!value.endsWith("/>") && !isVoidTag(tag)) depth += 1;
    if (depth === 0) return token.lastIndex;
  }
  return -1;
}
function isVoidTag(tag) { return ["img","hr","br","input","meta","link","source"].includes(tag); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function textContent(html) {
  return decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function decodeEntities(value) {
  return value.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
