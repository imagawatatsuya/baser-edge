/** Query key for the public renderer operator banner (`admin-view-banner.ts`). */
export const ADMIN_VIEW_QUERY = "baserAdminView";

export type BuildPublicLiveUrlOptions = {
  /** Adds `baserAdminView=published` so operators see the published-state banner. */
  showPublishedBanner?: boolean;
};

/**
 * Link to a published path on the public site. Site identity comes from the Worker `SITE_ID` binding.
 */
export function buildPublicLiveUrl(
  publicBase: string,
  path: string,
  options: BuildPublicLiveUrlOptions = {},
): string {
  const { showPublishedBanner = true } = options;
  const base = publicBase.replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
  if (showPublishedBanner) {
    url.searchParams.set(ADMIN_VIEW_QUERY, "published");
  }
  return url.toString();
}
