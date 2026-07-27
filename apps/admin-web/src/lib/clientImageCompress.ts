import {
  TRIAL_INLINE_CLIENT_MAX_SOURCE_BYTES,
  TRIAL_INLINE_MAX_BYTES_PER_OBJECT,
  TRIAL_INLINE_MAX_EDGE_PX,
} from "./trialInlineMedia";

export class TrialImageCompressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrialImageCompressError";
  }
}

export async function compressImageForTrialUpload(file: File): Promise<{
  blob: Blob;
  mediaType: "image/webp" | "image/jpeg";
  filename: string;
}> {
  if (file.size > TRIAL_INLINE_CLIENT_MAX_SOURCE_BYTES) {
    throw new TrialImageCompressError(
      `ファイルは ${Math.round(TRIAL_INLINE_CLIENT_MAX_SOURCE_BYTES / (1024 * 1024))}MB 以下にしてください。`,
    );
  }
  if (file.size <= 0) {
    throw new TrialImageCompressError("空のファイルはアップロードできません。");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > TRIAL_INLINE_MAX_EDGE_PX ? TRIAL_INLINE_MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new TrialImageCompressError("画像の処理に失敗しました。");
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    let mediaType: "image/webp" | "image/jpeg" = "image/webp";
    if (!blob || blob.size === 0) {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
      mediaType = "image/jpeg";
    }
    if (!blob) throw new TrialImageCompressError("画像の圧縮に失敗しました。");

    if (blob.size > TRIAL_INLINE_MAX_BYTES_PER_OBJECT) {
      const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.78);
      if (jpeg && jpeg.size > 0 && jpeg.size <= TRIAL_INLINE_MAX_BYTES_PER_OBJECT) {
        blob = jpeg;
        mediaType = "image/jpeg";
      }
    }
    if (blob.size > TRIAL_INLINE_MAX_BYTES_PER_OBJECT) {
      throw new TrialImageCompressError(
        "画像が大きすぎます。別の写真を選ぶか、クロップしてから再度お試しください。",
      );
    }

    const ext = mediaType === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/u, "").replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 80) || "image";
    return { blob, mediaType, filename: `${base}.${ext}` };
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((value) => resolve(value), type, quality);
  });
}
