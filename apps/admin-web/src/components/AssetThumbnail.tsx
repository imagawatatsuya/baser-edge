import { canShowPublicImagePreview, consoleAssetContentUrl } from "../lib/assetUrl";

export function AssetPreviewImage({ assetId, alt, className = "media-preview" }: { assetId: string; alt: string; className?: string }) {
  const src = consoleAssetContentUrl(assetId);
  return <img className={className} src={src} alt={alt || "アップロード済み画像"} loading="lazy" decoding="async" />;
}

export function AssetThumbnail({  assetId,
  mediaType,
  state,
  alt,
  className = "asset-thumb",
}: {
  assetId: string;
  mediaType: string;
  state: string;
  alt: string;
  className?: string;
}) {
  if (!canShowPublicImagePreview(mediaType, state)) {
    return <span className={`${className} asset-thumb-placeholder`} aria-hidden>—</span>;
  }
  return (
    <img
      className={className}
      src={consoleAssetContentUrl(assetId)}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
