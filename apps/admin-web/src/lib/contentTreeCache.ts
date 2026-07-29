import type { ContentTreeEntry } from "../api/types";

let cachedTree: { siteId: string; entries: ContentTreeEntry[] } | null = null;
let inflightTree: Promise<ContentTreeEntry[]> | null = null;

export function peekContentTreeCache(siteId: string): ContentTreeEntry[] | null {
  return cachedTree?.siteId === siteId ? cachedTree.entries : null;
}

export function setContentTreeCache(siteId: string, entries: ContentTreeEntry[]) {
  cachedTree = { siteId, entries };
}

export function invalidateContentTreeCache() {
  cachedTree = null;
}

export function getContentTreeInflight(): Promise<ContentTreeEntry[]> | null {
  return inflightTree;
}

export function setContentTreeInflight(promise: Promise<ContentTreeEntry[]> | null) {
  inflightTree = promise;
}

export function trackContentTreeInflight(request: Promise<ContentTreeEntry[]>) {
  const tracked = request.finally(() => {
    if (inflightTree === tracked) inflightTree = null;
  });
  inflightTree = tracked;
  return tracked;
}
