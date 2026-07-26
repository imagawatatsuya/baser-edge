export { ADMIN_VIEW_QUERY, buildPublicLiveUrl } from "./public-live-url.mjs";

export const PUBLIC_LIVE_TAB = "baser-edge-public-live";
export const PUBLIC_PREVIEW_TAB = "baser-edge-public-preview";

export function openNamedBrowserTab(url: string, windowName: string): void {
  const tab = window.open(url, windowName);
  tab?.focus();
}

export function shortRevisionId(revisionId: string | undefined): string {
  if (!revisionId) return "—";
  if (revisionId.length <= 10) return revisionId;
  return revisionId.slice(-8);
}
