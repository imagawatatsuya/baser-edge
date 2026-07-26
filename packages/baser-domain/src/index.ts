import { DomainError, assertDomain, type ContentItemId, type ContentNodeId, type SiteId } from "@baser-edge/core-types";

export type BaserContentKind = "folder" | "page" | "alias" | "blog" | "mail-form" | "custom-content";

export interface ContentNode {
  id: ContentNodeId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  parentId: ContentNodeId | null;
  slug: string;
  sortKey: string;
  cachedPath: string;
  treeVersion: number;
}

export interface RouteBinding {
  id: string;
  siteId: SiteId;
  contentItemId: ContentItemId;
  hostname: string;
  path: string;
  routeType: "canonical" | "alias";
  isCanonical: boolean;
  active: boolean;
}

export interface RedirectBinding {
  id: string;
  siteId: SiteId;
  sourceHostname: string;
  sourcePath: string;
  targetRouteId: string;
  statusCode: 301 | 302 | 307 | 308;
  active: boolean;
}

export function normalizeSlug(input: string): string {
  const normalized = input
    .normalize("NFC")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[\s\u3000]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  assertDomain(normalized.length > 0, "EMPTY_SLUG", "Slug cannot be empty", 422);
  assertDomain(normalized.length <= 160, "SLUG_TOO_LONG", "Slug must be 160 characters or fewer", 422);
  assertDomain(![".", ".."].includes(normalized), "INVALID_SLUG", "Slug cannot be . or ..", 422);
  assertDomain(!/[?#\\]/u.test(normalized), "INVALID_SLUG", "Slug contains a reserved character", 422);

  const ascii = normalized.toLowerCase();
  assertDomain(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ascii),
    "INVALID_SLUG",
    "Slug must use ASCII letters, numbers, and hyphens only (e.g. news, my-post)",
    422,
  );
  return ascii;
}

/** DNS-style hostname for site routing (ASCII labels, no port or path). */
const CLOUDFLARE_ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;

export function normalizeCloudflareOwnerEmail(input: string): string {
  const email = input.normalize("NFC").trim().toLowerCase();
  assertDomain(email.length > 0, "EMPTY_EMAIL", "Email cannot be empty", 422);
  assertDomain(email.length <= 254, "EMAIL_TOO_LONG", "Email must be 254 characters or fewer", 422);
  assertDomain(email.includes("@") && !email.startsWith("@") && !email.endsWith("@"), "INVALID_EMAIL", "Email format is invalid", 422);
  return email;
}

export function normalizeCloudflareAccountId(input: string): string {
  const accountId = input.trim().toLowerCase().replace(/-/g, "");
  assertDomain(CLOUDFLARE_ACCOUNT_ID_RE.test(accountId), "INVALID_CLOUDFLARE_ACCOUNT_ID", "Cloudflare account id must be 32 hex characters", 422);
  return accountId;
}

export function normalizeSiteHostname(input: string): string {
  const hostname = input.normalize("NFC").trim().toLowerCase();
  assertDomain(hostname.length > 0, "INVALID_HOSTNAME", "Hostname cannot be empty", 422);
  assertDomain(hostname.length <= 253, "INVALID_HOSTNAME", "Hostname must be 253 characters or fewer", 422);
  assertDomain(
    !hostname.includes("..") && !hostname.includes(":") && !hostname.includes("/") && !hostname.includes(" "),
    "INVALID_HOSTNAME",
    "Hostname must not contain spaces, slashes, or port syntax",
    422,
  );
  const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const labels = hostname.split(".");
  assertDomain(labels.length >= 2, "INVALID_HOSTNAME", "Hostname must include a domain suffix (e.g. example.test)", 422);
  assertDomain(
    labels.every((label) => labelPattern.test(label)),
    "INVALID_HOSTNAME",
    "Hostname must use ASCII letters, numbers, hyphens, and dots only (e.g. example.test)",
    422,
  );
  return hostname;
}

export function normalizePath(path: string): string {
  const normalized = `/${path}`.replace(/\/{2,}/g, "/");
  if (normalized === "/") return "/";
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function childPath(parentPath: string | null, slug: string): string {
  const safeSlug = normalizeSlug(slug);
  const parent = parentPath ? normalizePath(parentPath) : "/";
  return normalizePath(parent === "/" ? `/${safeSlug}` : `${parent}/${safeSlug}`);
}

export interface TreeMoveImpact {
  contentItemId: ContentItemId;
  oldPath: string;
  newPath: string;
}

export function calculatePathMoves(
  movingNode: ContentNode,
  descendants: readonly ContentNode[],
  newParentPath: string | null,
  newSlug = movingNode.slug,
): TreeMoveImpact[] {
  const oldRootPath = normalizePath(movingNode.cachedPath);
  const newRootPath = childPath(newParentPath, newSlug);
  const impacts: TreeMoveImpact[] = [{ contentItemId: movingNode.contentItemId, oldPath: oldRootPath, newPath: newRootPath }];

  for (const descendant of descendants) {
    const descendantPath = normalizePath(descendant.cachedPath);
    if (descendantPath === oldRootPath || !descendantPath.startsWith(`${oldRootPath}/`)) continue;
    const suffix = descendantPath.slice(oldRootPath.length);
    impacts.push({
      contentItemId: descendant.contentItemId,
      oldPath: descendantPath,
      newPath: normalizePath(`${newRootPath}${suffix}`),
    });
  }
  return impacts;
}

export function assertNoTreeCycle(nodeId: ContentNodeId, targetParentId: ContentNodeId | null, ancestorsOfTarget: readonly ContentNodeId[]): void {
  if (targetParentId === null) return;
  if (targetParentId === nodeId || ancestorsOfTarget.includes(nodeId)) {
    throw new DomainError("TREE_CYCLE", "A content node cannot be moved below itself", 422);
  }
}

export function isPublicRoutePath(path: string): boolean {
  const normalized = normalizePath(path);
  return !normalized.startsWith("/_baser/") && !normalized.startsWith("/_admin/") && !normalized.startsWith("/_preview/");
}

/** Sibling order in the site tree (see ContentNode.sortKey). */
export function compareSortKeys(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function buildSortKey(order: number, contentItemId: string): string {
  return `${String(order).padStart(8, "0")}:${contentItemId}`;
}

export { ADMIN_VIEW_QUERY, buildPublicLiveUrl, type BuildPublicLiveUrlOptions } from "./public-live-url.js";
