import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AssetThumbnail } from "../../components/AssetThumbnail";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { useMediaAssets } from "../../hooks/useMediaAssets";
import { assetLabel } from "../../lib/assets";
import { canShowPublicImagePreview, publicAssetUrl } from "../../lib/assetUrl";

function publicBaseFromSession(session: { publicUrl?: string } | null): string {
  return session?.publicUrl ?? "http://localhost:8788";
}

export function MediaLibraryPage() {
  const { assets, error, session } = useMediaAssets();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`media-asset-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightId, assets]);

  const publicBase = publicBaseFromSession(session);

  return (
    <>
      <section className="panel panel-pad media-library" id="media-library">
        <div className="panel-head-row">
          <h2 className="panel-title">ライブラリ</h2>
          <Link className="btn btn-primary" to="/media/upload">
            アップロード
          </Link>
        </div>
        <p className="panel-lead">
          ワークスペース内の一覧です。公開 URL（ローカル例: <code>{publicBase}/assets/…</code>）からも閲覧できます。
        </p>
        {assets.length === 0 ? (
          <p className="status">
            まだアセットがありません。{" "}
            <Link to="/media/upload">アップロード</Link> から追加してください。
          </p>
        ) : null}
        <ul className="media-grid">
          {assets.map((asset) => {
            const label = assetLabel(asset);
            const openUrl = publicAssetUrl(publicBase, asset.id);
            const isRecent = highlightId === asset.id;
            return (
              <li
                key={asset.id}
                id={`media-asset-${asset.id}`}
                className={`media-card${isRecent ? " media-card-recent" : ""}`}
              >
                <div className="media-card-thumb">
                  {asset.state === "ready" && canShowPublicImagePreview(asset.mediaType, asset.state) ? (
                    <a href={openUrl} target="_blank" rel="noopener noreferrer" className="media-card-thumb-link">
                      <AssetThumbnail assetId={asset.id} mediaType={asset.mediaType} state={asset.state} alt={label} />
                    </a>
                  ) : (
                    <AssetThumbnail assetId={asset.id} mediaType={asset.mediaType} state={asset.state} alt={label} />
                  )}
                </div>
                <div className="media-card-body">
                  <strong className="media-card-title">{label}</strong>
                  <span className="media-card-meta">{asset.mediaType}</span>
                  <code className="media-card-id">{asset.id}</code>
                  <span className="badge">{asset.state}</span>
                  {asset.state === "ready" ? (
                    <a className="btn btn-link media-card-open" href={openUrl} target="_blank" rel="noopener noreferrer">
                      画像を開く
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <StatusMessage message={error} />
    </>
  );
}
