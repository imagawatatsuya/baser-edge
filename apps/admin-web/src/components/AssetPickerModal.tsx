import { useWorkspaceMediaAssets } from "../hooks/useMediaAssets";
import type { AssetRow } from "../lib/assets";
import { assetLabel } from "../lib/assets";
import { AssetThumbnail } from "./AssetThumbnail";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export type { AssetRow } from "../lib/assets";

export function AssetPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (assetId: string) => void;
}) {
  const { assets, error } = useWorkspaceMediaAssets();

  const ready = assets.filter((a) => a.state === "ready");

  return (
    <Modal
      title="画像を選択"
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>キャンセル</Button>
        </>
      )}
    >
      {error ? <p className="status status-error">{error}</p> : null}
      <ul className="asset-picker-list asset-picker-grid">
        {ready.map((asset) => (
          <li key={asset.id}>
            <button type="button" className="asset-picker-item" onClick={() => { onSelect(asset.id); onClose(); }}>
              <AssetThumbnail
                assetId={asset.id}
                mediaType={asset.mediaType}
                state={asset.state}
                alt={assetLabel(asset)}
              />
              <span className="asset-picker-meta">
                <strong>{assetLabel(asset)}</strong>
                <span>{asset.mediaType}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!ready.length && !error ? <p className="status">メディアがありません。メディア画面からアップロードしてください。</p> : null}
    </Modal>
  );
}
