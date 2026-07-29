export const PUBLIC_LIVE_TAB = "baser-edge-public-live";
export const PUBLIC_VISITOR_TAB = "baser-edge-public-visitor-live";
export const PUBLIC_PREVIEW_TAB = "baser-edge-public-preview";

export { buildPublicLiveUrl, type BuildPublicLiveUrlOptions } from "@baser-edge/baser-domain";

export function openNamedBrowserTab(url: string, windowName: string): Window | null {
  const tab = window.open(url, windowName);
  tab?.focus();
  return tab;
}

export function shortRevisionId(revisionId: string | undefined): string {
  if (!revisionId) return "—";
  if (revisionId.length <= 10) return revisionId;
  return revisionId.slice(-8);
}
