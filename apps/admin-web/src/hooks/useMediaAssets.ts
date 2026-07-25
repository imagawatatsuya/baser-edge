import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { AssetRow } from "../lib/assets";

export function useMediaAssets() {
  const { session } = useAuth();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    const list = await apiFetch<AssetRow[]>(`/v1/assets?workspaceId=${encodeURIComponent(session.workspaceId)}`);
    setAssets(list);
  }, [session]);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reload]);

  return { assets, error, reload, session };
}
