import { apiFetch } from "../api/client";
import type { AssetRow } from "./assets";

let cached: { workspaceId: string; assets: AssetRow[] } | null = null;
let inflight: Promise<AssetRow[]> | null = null;

export function peekMediaAssetsCache(workspaceId: string): AssetRow[] | null {
  return cached?.workspaceId === workspaceId ? cached.assets : null;
}

export function setMediaAssetsCache(workspaceId: string, assets: AssetRow[]) {
  cached = { workspaceId, assets };
}

export function invalidateMediaAssetsCache() {
  cached = null;
}

export async function fetchWorkspaceMediaAssets(
  workspaceId: string,
  options?: { fresh?: boolean },
): Promise<AssetRow[]> {
  if (options?.fresh) {
    invalidateMediaAssetsCache();
    inflight = null;
  }
  if (!options?.fresh) {
    const hit = peekMediaAssetsCache(workspaceId);
    if (hit) return hit;
    if (inflight) return inflight;
  }

  const request = apiFetch<AssetRow[]>(`/v1/assets?workspaceId=${encodeURIComponent(workspaceId)}`).then((list) => {
    setMediaAssetsCache(workspaceId, list);
    return list;
  });

  inflight = request.finally(() => {
    if (inflight === request) inflight = null;
  });

  return request;
}
