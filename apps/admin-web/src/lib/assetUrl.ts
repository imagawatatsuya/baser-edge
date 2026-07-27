import { isAllowedImageMediaType } from "./imageUpload";

export function publicAssetUrl(publicBase: string, assetId: string): string {
  const base = publicBase.replace(/\/$/, "");
  return `${base}/assets/${encodeURIComponent(assetId)}`;
}

/** Console-origin authenticated bytes (not subject to public fail-closed delivery). */
export function consoleAssetContentUrl(assetId: string): string {
  return `/v1/assets/${encodeURIComponent(assetId)}/content`;
}

export function canShowPublicImagePreview(mediaType: string, state: string): boolean {
  return state === "ready" && isAllowedImageMediaType(mediaType);
}
