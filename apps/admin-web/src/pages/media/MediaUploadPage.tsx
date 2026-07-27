import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { AssetThumbnail } from "../../components/AssetThumbnail";
import { Field } from "../../components/ui/Field";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { useConsoleCapabilities } from "../../hooks/useConsoleCapabilities";
import { useMediaAssetsContext } from "../../hooks/useMediaAssets";
import type { AssetRow } from "../../lib/assets";
import { assetLabel } from "../../lib/assets";
import { canShowPublicImagePreview, publicAssetUrl } from "../../lib/assetUrl";
import { compressImageForTrialUpload, TrialImageCompressError } from "../../lib/clientImageCompress";
import {
  ALLOWED_IMAGE_MEDIA_TYPES,
  DEFAULT_MAX_IMAGE_BYTES,
  isAllowedImageMediaType,
  isPreviewableImageFile,
} from "../../lib/imageUpload";
import { resolvePublicSiteOrigin } from "../../lib/localDevUrls";
import { TRIAL_INLINE_MAX_ASSETS } from "../../lib/trialInlineMedia";

type UploadSessionResponse = {
  uploadUrl: string;
  asset: AssetRow;
};

type LastUploaded = Pick<AssetRow, "id" | "originalFilename" | "mediaType" | "state">;

function publicBaseFromSession(session: { publicUrl?: string } | null): string {
  return resolvePublicSiteOrigin(session);
}

export function MediaUploadPage() {
  const { capabilities } = useConsoleCapabilities();
  const { assets, session, reload } = useMediaAssetsContext();
  const trialInline = capabilities?.assetStorage === "d1-inline";
  const maxAssets = capabilities?.trialInlineMedia?.maxAssets ?? TRIAL_INLINE_MAX_ASSETS;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<LastUploaded | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCount = assets.length;
  const atTrialLimit = trialInline && activeCount >= maxAssets;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const previewMax = trialInline ? 15 * 1024 * 1024 : DEFAULT_MAX_IMAGE_BYTES;
    if (!isAllowedImageMediaType(file.type) || file.size <= 0 || file.size > previewMax) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, trialInline]);

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
    if (!session || !file || atTrialLimit) return;

    setBusy(true);
    setStatus(trialInline ? "画像を最適化しています…" : "アップロード中…");
    setCopyHint("");
    try {
      let uploadBody: Blob = file;
      let filename = file.name;
      let mediaType = file.type;

      if (trialInline) {
        if (!isAllowedImageMediaType(file.type)) {
          setStatus("この形式の画像はアップロードできません（JPEG / PNG / WebP / GIF のみ）。");
          return;
        }
        const compressed = await compressImageForTrialUpload(file);
        uploadBody = compressed.blob;
        filename = compressed.filename;
        mediaType = compressed.mediaType;
      } else {
        if (!isAllowedImageMediaType(file.type)) {
          setStatus("この形式の画像はアップロードできません（JPEG / PNG / WebP / GIF のみ）。");
          return;
        }
        if (file.size <= 0 || file.size > DEFAULT_MAX_IMAGE_BYTES) {
          setStatus(`ファイルサイズは 1 バイト以上 ${DEFAULT_MAX_IMAGE_BYTES / (1024 * 1024)}MB 以下にしてください。`);
          return;
        }
      }

      setStatus("アップロード中…");
      const sessionRes = await apiFetch<UploadSessionResponse>("/v1/assets/upload-sessions", {
        method: "POST",
        json: {
          workspaceId: session.workspaceId,
          filename,
          mediaType,
          uploadBaseUrl: window.location.origin,
          ...(trialInline ? {} : { maximumBytes: uploadBody.size }),
        },
      });
      const put = await fetch(sessionRes.uploadUrl, {
        method: "PUT",
        headers: { "content-type": mediaType },
        body: uploadBody,
      });
      if (!put.ok) throw new Error(`アップロード失敗 (${put.status})`);
      const uploaded = (await put.json()) as AssetRow;
      const confirmed: LastUploaded = {
        id: uploaded.id ?? sessionRes.asset.id,
        originalFilename: uploaded.originalFilename ?? sessionRes.asset.originalFilename ?? filename,
        mediaType: uploaded.mediaType ?? mediaType,
        state: uploaded.state ?? "ready",
      };
      setLastUploaded(confirmed);
      await reload();
      onFileChange(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("");
    } catch (err) {
      if (err instanceof TrialImageCompressError) {
        setStatus(err.message);
      } else {
        setStatus(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const maxBytes = trialInline
    ? (capabilities?.trialInlineMedia?.maxBytesPerObject ?? 2 * 1024 * 1024)
    : DEFAULT_MAX_IMAGE_BYTES;
  const showPreview = Boolean(file && previewUrl);
  const previewBlocked =
    file &&
    !trialInline &&
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
        <p className="panel-lead">
          {trialInline
            ? `お試し環境では画像を最大 ${maxAssets} 枚まで（1 枚あたり約 ${Math.round(maxBytes / (1024 * 1024))}MB、スマホ向けに自動圧縮）。現在 ${activeCount}/${maxAssets} 枚。`
            : "登録後はライブラリと公開 URL から利用できます。"}
        </p>
        <Field label="ファイル">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MEDIA_TYPES.join(",")}
            disabled={atTrialLimit}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          {showPreview ? (
            <div className="media-preview-wrap">
              <img className="media-preview media-preview--upload" src={previewUrl!} alt={file!.name} />
            </div>
          ) : null}
          {previewBlocked ? <p className="media-preview-hint">{previewBlocked}</p> : null}
          {atTrialLimit ? (
            <p className="media-preview-hint">
              上限に達しました。不要な画像をライブラリから削除するか、本番用に R2 を有効化してください。
            </p>
          ) : null}
        </Field>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !file || atTrialLimit || (!trialInline && !isPreviewableImageFile(file))}
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
