import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import type { AssetRow } from "../lib/assets";
import {
  fetchWorkspaceMediaAssets,
  invalidateMediaAssetsCache,
  peekMediaAssetsCache,
} from "../lib/mediaAssetsCache";

export type MediaAssetsState = {
  assets: AssetRow[];
  error: string;
  reload: () => Promise<void>;
  session: ReturnType<typeof useAuth>["session"];
};

const MediaAssetsContext = createContext<MediaAssetsState | null>(null);

export function useMediaAssets() {
  const { session } = useAuth();
  const [assets, setAssets] = useState<AssetRow[]>(() =>
    (session ? peekMediaAssetsCache(session.workspaceId) : null) ?? [],
  );
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    invalidateMediaAssetsCache();
    const list = await fetchWorkspaceMediaAssets(session.workspaceId, { fresh: true });
    setAssets(list);
    setError("");
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void fetchWorkspaceMediaAssets(session.workspaceId)
      .then((list) => {
        setAssets(list);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [session]);

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

/** Shared workspace asset list (e.g. editor asset picker). Uses the same cache as MediaLayout. */
export function useWorkspaceMediaAssets() {
  const { session } = useAuth();
  const [assets, setAssets] = useState<AssetRow[]>(() =>
    (session ? peekMediaAssetsCache(session.workspaceId) : null) ?? [],
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    void fetchWorkspaceMediaAssets(session.workspaceId)
      .then(setAssets)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [session]);

  return { assets, error, session };
}
