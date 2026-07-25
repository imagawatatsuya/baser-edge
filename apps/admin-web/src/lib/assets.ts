import { apiFetch } from "../api/client";
import { formatAssetDeleteError } from "./formatAssetDeleteError.mjs";

export type AssetRow = {
  id: string;
  originalFilename: string;
  mediaType: string;
  state: string;
  byteSize?: number | null;
};

export function assetLabel(asset: Pick<AssetRow, "originalFilename" | "id">): string {
  return asset.originalFilename?.trim() || asset.id;
}

export async function deleteAsset(assetId: string): Promise<void> {
  await apiFetch(`/v1/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
}

export { formatAssetDeleteError };
