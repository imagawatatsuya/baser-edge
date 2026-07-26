import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { AssetRow } from "../lib/assets";

export type MediaAssetsState = {
  assets: AssetRow[];
  error: string;
  reload: () => Promise<void>;
  session: ReturnType<typeof useAuth>["session"];
};

const MediaAssetsContext = createContext<MediaAssetsState | null>(null);

export function useMediaAssets() {
  const { session } = useAuth();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    const list = await apiFetch<AssetRow[]>(`/v1/assets?workspaceId=${encodeURIComponent(session.workspaceId)}`);
    setAssets(list);
    setError("");
  }, [session]);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reload]);

  return { assets, error, reload, session };
}

export function MediaAssetsProvider({ value, children }: { value: MediaAssetsState; children: ReactNode }) {
  return createElement(MediaAssetsContext.Provider, { value }, children);
}

export function useMediaAssetsContext(): MediaAssetsState {
  const ctx = useContext(MediaAssetsContext);
  if (!ctx) throw new Error("useMediaAssetsContext must be used within MediaLayout");
  return ctx;
}
