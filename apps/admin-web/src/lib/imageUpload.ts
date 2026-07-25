/** Matches asset-kernel defaultAllowedMediaTypes image subset. */
export const ALLOWED_IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const DEFAULT_MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export function isAllowedImageMediaType(mediaType: string): boolean {
  return (ALLOWED_IMAGE_MEDIA_TYPES as readonly string[]).includes(mediaType);
}

export function isPreviewableImageFile(file: File, maxBytes = DEFAULT_MAX_IMAGE_BYTES): boolean {
  return isAllowedImageMediaType(file.type) && file.size > 0 && file.size <= maxBytes;
}
