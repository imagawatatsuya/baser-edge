import { isAllowedImageMediaType } from "./imageUpload";

export function publicAssetUrl(publicBase: string, assetId: string): string {
  const base = publicBase.replace(/\/$/, "");
  return `${base}/assets/${encodeURIComponent(assetId)}`;
}

export function canShowPublicImagePreview(mediaType: string, state: string): boolean {
  return state === "ready" && isAllowedImageMediaType(mediaType);
}
