import { apiFetch } from "../api/client";

const THUMBNAIL_MAX_EDGE = 256;
const THUMBNAIL_MAX_BYTES = 256 * 1024;
const generatedInThisPage = new Set<string>();
const generationInFlight = new Map<string, Promise<void>>();

function storageKey(assetId: string): string {
  return `baser-asset-thumbnail:${assetId}`;
}

function wasGenerated(assetId: string): boolean {
  if (generatedInThisPage.has(assetId)) return true;
  try {
    return localStorage.getItem(storageKey(assetId)) === "1";
  } catch {
    return false;
  }
}

function markGenerated(assetId: string): void {
  generatedInThisPage.add(assetId);
  try {
    localStorage.setItem(storageKey(assetId), "1");
  } catch {
    // Storage can be unavailable in private browsing; the in-memory guard still prevents loops.
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function renderThumbnail(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): Promise<Blob> {
  const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("サムネイルを生成できませんでした。");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  let blob = await canvasBlob(canvas, 0.78);
  if (blob && blob.size > THUMBNAIL_MAX_BYTES) blob = await canvasBlob(canvas, 0.55);
  if (!blob || blob.size <= 0 || blob.size > THUMBNAIL_MAX_BYTES) {
    throw new Error("サムネイルを生成できませんでした。");
  }
  return blob;
}

export async function createAssetThumbnail(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    return await renderThumbnail(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export async function persistAssetThumbnail(assetId: string, thumbnail: Blob): Promise<void> {
  await apiFetch(`/v1/assets/${encodeURIComponent(assetId)}/thumbnail`, {
    method: "PUT",
    headers: { "content-type": "image/webp" },
    body: thumbnail,
  });
  markGenerated(assetId);
}

/**
 * Backfills thumbnails for assets uploaded before derivative support.
 * Native image lazy-loading remains in control; work starts only after the image is visible.
 */
export function ensureAssetThumbnailFromImage(assetId: string, image: HTMLImageElement): void {
  if (wasGenerated(assetId) || generationInFlight.has(assetId)) return;
  const task = renderThumbnail(image, image.naturalWidth, image.naturalHeight)
    .then((thumbnail) => persistAssetThumbnail(assetId, thumbnail))
    .catch(() => {
      // The original image is already visible. A later visit may retry the optional backfill.
    })
    .finally(() => generationInFlight.delete(assetId));
  generationInFlight.set(assetId, task);
}
