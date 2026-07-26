import { useCallback, useEffect, useState } from "react";
import type { ContentTreeEntry } from "../api/types";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import {
  getContentTreeInflight,
  invalidateContentTreeCache,
  peekContentTreeCache,
  setContentTreeCache,
  trackContentTreeInflight,
} from "../lib/contentTreeCache";

export { invalidateContentTreeCache } from "../lib/contentTreeCache";

async function fetchContentTree(siteId: string, options?: { fresh?: boolean }): Promise<ContentTreeEntry[]> {
  const inflight = getContentTreeInflight();
  if (inflight && !options?.fresh) return inflight;
  const request = apiFetch<ContentTreeEntry[]>(`/v1/sites/${siteId}/content-tree`);
  trackContentTreeInflight(request);
  return request;
}

export function useContentTree() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<ContentTreeEntry[]>(() => (
    session ? peekContentTreeCache(session.siteId) ?? [] : []
  ));
  const [error, setError] = useState("");
  const [isReloading, setIsReloading] = useState(false);

  const reload = useCallback(async (options?: { force?: boolean }) => {
    if (!session) return;
    const { siteId } = session;
    const force = options?.force ?? true;
    if (!force && peekContentTreeCache(siteId)) {
      setEntries(peekContentTreeCache(siteId)!);
      setError("");
      return;
    }
    if (force) invalidateContentTreeCache();
    setIsReloading(true);
    try {
      const tree = await fetchContentTree(siteId, { fresh: force });
      setContentTreeCache(siteId, tree);
      setEntries(tree);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsReloading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload({ force: false });
  }, [reload]);

  return { entries, error, isReloading, reload };
}
