/** Matches `apps/public-renderer/src/admin-view-banner.ts`. */
export const ADMIN_VIEW_QUERY = "baserAdminView";

/**
 * Operator link to the published site at a content path.
 * Site identity comes from the public Worker `SITE_ID` binding — not from query params.
 */
export function buildPublicLiveUrl(publicBase, path, options = {}) {
  const { showPublishedBanner = true } = options;
  const base = publicBase.replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
  if (showPublishedBanner) {
    url.searchParams.set(ADMIN_VIEW_QUERY, "published");
  }
  return url.toString();
}
