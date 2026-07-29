import type { ArticleMeta, ContentSnapshot } from "../api/types";
import { apiFetch } from "../api/client";

type CachedEditorPayload = {
  snapshot: ContentSnapshot;
  articleMeta: ArticleMeta | null;
};

const snapshotById = new Map<string, CachedEditorPayload>();
const inflightById = new Map<string, Promise<CachedEditorPayload>>();

export function peekContentEditorCache(contentId: string): CachedEditorPayload | null {
  return snapshotById.get(contentId) ?? null;
}

export function setContentEditorCache(contentId: string, payload: CachedEditorPayload) {
  snapshotById.set(contentId, payload);
}

export function invalidateContentEditorCache(contentId?: string) {
  if (contentId) {
    snapshotById.delete(contentId);
    inflightById.delete(contentId);
  } else {
    snapshotById.clear();
    inflightById.clear();
  }
}

export async function fetchContentEditorPayload(
  contentId: string,
  options?: { isArticle?: boolean; fresh?: boolean },
): Promise<CachedEditorPayload> {
  if (options?.fresh) {
    invalidateContentEditorCache(contentId);
  }

  const inflight = inflightById.get(contentId);
  if (inflight) return inflight;

  const request = (async () => {
    const payload = await apiFetch<CachedEditorPayload>(
      `/v1/content/${encodeURIComponent(contentId)}/editor`,
    );
    const { snapshot } = payload;
    if (snapshot.workingRevision?.id) {
      setContentEditorCache(contentId, payload);
    }
    return payload;
  })();

  const tracked = request.finally(() => {
    if (inflightById.get(contentId) === tracked) inflightById.delete(contentId);
  });
  inflightById.set(contentId, tracked);
  return tracked;
}

/** Warm cache before navigation (tree hover / focus). */
export function prefetchContentEditor(contentId: string, isArticle: boolean) {
  if (peekContentEditorCache(contentId)) return;
  void fetchContentEditorPayload(contentId, { isArticle }).catch(() => {
    /* ignore prefetch errors */
  });
}
