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
  if (contentId) snapshotById.delete(contentId);
  else snapshotById.clear();
}

export async function fetchContentEditorPayload(
  contentId: string,
  options?: { isArticle?: boolean },
): Promise<CachedEditorPayload> {
  const inflight = inflightById.get(contentId);
  if (inflight) return inflight;

  const isArticle = options?.isArticle;
  const request = (async () => {
    if (isArticle === true) {
      const [snapshot, articleMeta] = await Promise.all([
        apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(contentId)}`),
        apiFetch<ArticleMeta>(`/v1/content/${encodeURIComponent(contentId)}/article-meta`),
      ]);
      const payload = { snapshot, articleMeta };
      setContentEditorCache(contentId, payload);
      return payload;
    }
    const snapshot = await apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(contentId)}`);
    let articleMeta: ArticleMeta | null = null;
    if (isArticle === undefined && snapshot.item.contentTypeKey === "article") {
      articleMeta = await apiFetch<ArticleMeta>(`/v1/content/${encodeURIComponent(contentId)}/article-meta`);
    }
    const payload = { snapshot, articleMeta };
    setContentEditorCache(contentId, payload);
    return payload;
  })();

  inflightById.set(
    contentId,
    request.finally(() => {
      if (inflightById.get(contentId) === request) inflightById.delete(contentId);
    }),
  );
  return request;
}

/** Warm cache before navigation (tree hover / focus). */
export function prefetchContentEditor(contentId: string, isArticle: boolean) {
  if (peekContentEditorCache(contentId)) return;
  void fetchContentEditorPayload(contentId, { isArticle }).catch(() => {
    /* ignore prefetch errors */
  });
}
