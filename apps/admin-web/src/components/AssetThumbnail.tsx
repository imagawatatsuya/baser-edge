import { canShowPublicImagePreview, consoleAssetThumbnailUrl } from "../lib/assetUrl";
import { ensureAssetThumbnailFromImage } from "../lib/assetThumbnail";

export function AssetPreviewImage({ assetId, alt, className = "media-preview" }: { assetId: string; alt: string; className?: string }) {
  const src = consoleAssetThumbnailUrl(assetId);
  return (
    <img
      className={className}
      src={src}
      alt={alt || "アップロード済み画像"}
      loading="lazy"
      decoding="async"
      onLoad={(event) => ensureAssetThumbnailFromImage(assetId, event.currentTarget)}
    />
  );
}

export function AssetThumbnail({
  assetId,
  mediaType,
  state,
  alt,
  className = "asset-thumb",
  eager = false,
}: {
  assetId: string;
  mediaType: string;
  state: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  if (!canShowPublicImagePreview(mediaType, state)) {
    return <span className={`${className} asset-thumb-placeholder`} aria-hidden>—</span>;
  }
  return (
    <img
      className={className}
      src={consoleAssetThumbnailUrl(assetId)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={(event) => ensureAssetThumbnailFromImage(assetId, event.currentTarget)}
    />
  );
}
