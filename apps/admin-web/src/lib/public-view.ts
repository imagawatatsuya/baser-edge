export const PUBLIC_LIVE_TAB = "baser-edge-public-live";
export const PUBLIC_PREVIEW_TAB = "baser-edge-public-preview";
export const ADMIN_VIEW_QUERY = "baserAdminView";

export function buildPublicLiveUrl(
  publicBase: string,
  path: string,
  siteId: string,
  revisionId?: string,
): string {
  const base = publicBase.replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
  url.searchParams.set("siteId", siteId);
  url.searchParams.set(ADMIN_VIEW_QUERY, "published");
  if (revisionId) url.searchParams.set("v", revisionId);
  return url.toString();
}

export function openNamedBrowserTab(url: string, windowName: string): void {
  const tab = window.open(url, windowName);
  tab?.focus();
}

export function shortRevisionId(revisionId: string | undefined): string {
  if (!revisionId) return "—";
  if (revisionId.length <= 10) return revisionId;
  return revisionId.slice(-8);
}
