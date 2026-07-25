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
