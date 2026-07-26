import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { AssetThumbnail } from "../../components/AssetThumbnail";
import { Field } from "../../components/ui/Field";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { useMediaAssetsContext } from "../../hooks/useMediaAssets";
import type { AssetRow } from "../../lib/assets";
import { assetLabel } from "../../lib/assets";
import { canShowPublicImagePreview, publicAssetUrl } from "../../lib/assetUrl";
import {
  ALLOWED_IMAGE_MEDIA_TYPES,
  DEFAULT_MAX_IMAGE_BYTES,
  isAllowedImageMediaType,
  isPreviewableImageFile,
} from "../../lib/imageUpload";
import { resolvePublicSiteOrigin } from "../../lib/localDevUrls";

type UploadSessionResponse = {
  uploadUrl: string;
  asset: AssetRow;
};

type LastUploaded = Pick<AssetRow, "id" | "originalFilename" | "mediaType" | "state">;

function publicBaseFromSession(session: { publicUrl?: string } | null): string {
  return resolvePublicSiteOrigin(session);
}

export function MediaUploadPage() {
  const { session, reload } = useMediaAssetsContext();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<LastUploaded | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || !isPreviewableImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onFileChange(next: File | null) {
    setFile(next);
    setStatus("");
    setCopyHint("");
  }

  async function copyViewUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyHint("URL をコピーしました。");
    } catch {
      setCopyHint("コピーに失敗しました。URL を手動で選択してください。");
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !file) return;
    if (!isAllowedImageMediaType(file.type)) {
      setStatus("この形式の画像はアップロードできません（JPEG / PNG / WebP / GIF のみ）。");
      return;
    }
    if (file.size <= 0 || file.size > DEFAULT_MAX_IMAGE_BYTES) {
      setStatus(`ファイルサイズは 1 バイト以上 ${DEFAULT_MAX_IMAGE_BYTES / (1024 * 1024)}MB 以下にしてください。`);
      return;
    }
    setBusy(true);
    setStatus("アップロード中…");
    setCopyHint("");
    try {
      const sessionRes = await apiFetch<UploadSessionResponse>("/v1/assets/upload-sessions", {
        method: "POST",
        json: {
          workspaceId: session.workspaceId,
          filename: file.name,
          mediaType: file.type,
          maximumBytes: file.size,
        },
      });
      const put = await fetch(sessionRes.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`アップロード失敗 (${put.status})`);
      const uploaded = (await put.json()) as AssetRow;
      const confirmed: LastUploaded = {
        id: uploaded.id ?? sessionRes.asset.id,
        originalFilename: uploaded.originalFilename ?? sessionRes.asset.originalFilename ?? file.name,
        mediaType: uploaded.mediaType ?? file.type,
        state: uploaded.state ?? "ready",
      };
      setLastUploaded(confirmed);
      await reload();
      onFileChange(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const showPreview = Boolean(file && previewUrl);
  const previewBlocked =
    file &&
    !isPreviewableImageFile(file) &&
    (file.size > DEFAULT_MAX_IMAGE_BYTES
      ? "プレビューできません（サイズ上限を超えています）。"
      : !isAllowedImageMediaType(file.type)
        ? "プレビューできません（許可されていない形式です）。"
        : null);

  const publicBase = publicBaseFromSession(session);
  const lastViewUrl = lastUploaded ? publicAssetUrl(publicBase, lastUploaded.id) : null;

  return (
    <>
      <form className="panel panel-pad" onSubmit={(e) => void onUpload(e)}>
        <h2 className="panel-title">ファイルをアップロード</h2>
        <p className="panel-lead">登録後はライブラリと公開 URL から利用できます。</p>
        <Field label="ファイル">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MEDIA_TYPES.join(",")}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          {showPreview ? (
            <div className="media-preview-wrap">
              <img className="media-preview media-preview--upload" src={previewUrl!} alt={file!.name} />
            </div>
          ) : null}
          {previewBlocked ? <p className="media-preview-hint">{previewBlocked}</p> : null}
        </Field>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !file || !isPreviewableImageFile(file)}
        >
          アップロード
        </button>
      </form>

      {lastUploaded && lastViewUrl ? (
        <section className="panel panel-pad media-upload-success" aria-live="polite">
          <div className="media-upload-success-header">
            <h2 className="panel-title">アップロード完了</h2>
            <button type="button" className="btn btn-link" onClick={() => { setLastUploaded(null); setCopyHint(""); }}>
              閉じる
            </button>
          </div>
          <div className="media-upload-success-body">
            {canShowPublicImagePreview(lastUploaded.mediaType, lastUploaded.state) ? (
              <a className="media-upload-success-thumb" href={lastViewUrl} target="_blank" rel="noopener noreferrer">
                <AssetThumbnail
                  assetId={lastUploaded.id}
                  mediaType={lastUploaded.mediaType}
                  state={lastUploaded.state}
                  alt={assetLabel(lastUploaded)}
                  className="asset-thumb media-upload-success-img"
                />
              </a>
            ) : null}
            <div className="media-upload-success-meta">
              <strong>{assetLabel(lastUploaded)}</strong>
              <span className="media-card-meta">{lastUploaded.mediaType}</span>
              <code className="media-card-id">{lastUploaded.id}</code>
              <p className="media-url-label">公開 URL（サイト配信と同じ）</p>
              <a className="media-url-link" href={lastViewUrl} target="_blank" rel="noopener noreferrer">{lastViewUrl}</a>
              <div className="media-upload-actions">
                <a className="btn btn-primary" href={lastViewUrl} target="_blank" rel="noopener noreferrer">画像を開く</a>
                <Link className="btn" to={`/media?highlight=${encodeURIComponent(lastUploaded.id)}`}>ライブラリで表示</Link>
                <Link className="btn" to="/content">コンテンツで使う</Link>
                <button type="button" className="btn btn-link" onClick={() => void copyViewUrl(lastViewUrl)}>URL をコピー</button>
              </div>
              {copyHint ? <p className="media-preview-hint">{copyHint}</p> : null}
              <p className="media-preview-hint">ページ本文へは「サイトツリー」→ ページ編集 →「画像を挿入」からこのアセットを選べます。</p>
            </div>
          </div>
        </section>
      ) : null}

      <StatusMessage message={status} />
    </>
  );
}
