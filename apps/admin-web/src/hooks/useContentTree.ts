import { useCallback, useEffect, useState } from "react";
import type { ContentTreeEntry } from "../api/types";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function useContentTree() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<ContentTreeEntry[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const tree = await apiFetch<ContentTreeEntry[]>(`/v1/sites/${session.siteId}/content-tree`);
      setEntries(tree);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [session]);

  useEffect(() => { void reload(); }, [reload]);

  return { entries, error, reload };
}
