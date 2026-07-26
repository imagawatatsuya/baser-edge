import { useAuth } from "../auth/AuthProvider";
import { canShowPublicImagePreview, publicAssetUrl } from "../lib/assetUrl";
import { resolvePublicSiteOrigin } from "../lib/localDevUrls";

export function AssetPreviewImage({ assetId, alt, className = "media-preview" }: { assetId: string; alt: string; className?: string }) {
  const { session } = useAuth();
  const src = publicAssetUrl(resolvePublicSiteOrigin(session), assetId);
  return <img className={className} src={src} alt={alt || "アップロード済み画像"} loading="lazy" decoding="async" />;
}

export function AssetThumbnail({
  assetId,
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
  const { session } = useAuth();
  const publicBase = resolvePublicSiteOrigin(session);
  if (!canShowPublicImagePreview(mediaType, state)) {
    return <span className={`${className} asset-thumb-placeholder`} aria-hidden>—</span>;
  }
  return (
    <img
      className={className}
      src={publicAssetUrl(publicBase, assetId)}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
