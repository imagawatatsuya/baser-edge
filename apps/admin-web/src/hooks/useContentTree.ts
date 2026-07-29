import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode, type SetStateAction } from "react";
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
  return trackContentTreeInflight(request);
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

  const updateEntries = useCallback((update: SetStateAction<ContentTreeEntry[]>) => {
    if (!session) return;
    setEntries((current) => {
      const next = typeof update === "function" ? update(current) : update;
      setContentTreeCache(session.siteId, next);
      return next;
    });
  }, [session]);

  useEffect(() => {
    void reload({ force: false });
  }, [reload]);

  return { entries, error, isReloading, reload, updateEntries };
}

export type ContentTreeState = ReturnType<typeof useContentTree>;

const ContentTreeContext = createContext<ContentTreeState | null>(null);

export function ContentTreeProvider({ value, children }: { value: ContentTreeState; children: ReactNode }) {
  return createElement(ContentTreeContext.Provider, { value }, children);
}

/** Shared tree state from ContentLayout (for child routes such as the editor). */
export function useContentTreeContext(): ContentTreeState {
  const ctx = useContext(ContentTreeContext);
  if (!ctx) throw new Error("useContentTreeContext must be used within ContentLayout");
  return ctx;
}
