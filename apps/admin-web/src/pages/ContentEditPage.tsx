import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, publishContent, unpublishContent } from "../api/client";
import type { ArticleMeta, ContentSnapshot } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { AssetPickerModal } from "../components/AssetPickerModal";
import { BlockEditor } from "../components/BlockEditor";
import { PublicMediaDeliveryGuide } from "../components/PublicMediaDeliveryGuide";
import { RevisionBadges } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { StatusMessage } from "../components/ui/StatusMessage";
import { resolvePublicSiteOrigin } from "../lib/localDevUrls";
import { isEditorDirty, readTitleAndBlocks, writeTitleAndBlocks, type BodyBlock } from "../lib/blocks";
import { formatDateTime, parseDatetimeLocalValue, toDatetimeLocalValue } from "../lib/dates";
import {
  buildPublicLiveUrl,
  openNamedBrowserTab,
  PUBLIC_LIVE_TAB,
  PUBLIC_PREVIEW_TAB,
  PUBLIC_VISITOR_TAB,
} from "../lib/public-view";
import { trashContent } from "../lib/contentTrash";
import { useContentTreeContext } from "../hooks/useContentTree";
import {
  fetchContentEditorPayload,
  invalidateContentEditorCache,
  peekContentEditorCache,
} from "../lib/contentSnapshotCache";

function applyEditorPayload(
  payload: { snapshot: ContentSnapshot; articleMeta: ArticleMeta | null },
  setters: {
    setSnapshot: (s: ContentSnapshot) => void;
    setArticleMeta: (m: ArticleMeta | null) => void;
    setPostedAtLocal: (v: string) => void;
    setTitle: (t: string) => void;
    setBlocks: (b: BodyBlock[]) => void;
  },
) {
  const { snapshot, articleMeta } = payload;
  setters.setSnapshot(snapshot);
  if (articleMeta) {
    setters.setArticleMeta(articleMeta);
    setters.setPostedAtLocal(toDatetimeLocalValue(articleMeta.postedAt));
  } else {
    setters.setArticleMeta(null);
    setters.setPostedAtLocal("");
  }
  if (snapshot.workingRevision) {
    const parsed = readTitleAndBlocks(snapshot.workingRevision.document);
    setters.setTitle(parsed.title || String(snapshot.workingRevision.fields.title ?? ""));
    setters.setBlocks(parsed.blocks);
  }
}

export function ContentEditPage() {
  const { contentId = "" } = useParams();
  const navigate = useNavigate();
  const { reload: reloadContentTree, entries } = useContentTreeContext();
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<BodyBlock[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageInsertIndex, setImageInsertIndex] = useState<number | null>(null);
  const [articleMeta, setArticleMeta] = useState<ArticleMeta | null>(null);
  const [postedAtLocal, setPostedAtLocal] = useState("");

  const load = useCallback(async (options?: { silent?: boolean }): Promise<ContentSnapshot | null> => {
    if (!session || !contentId) return null;
    const setters = { setSnapshot, setArticleMeta, setPostedAtLocal, setTitle, setBlocks };
    const cached = peekContentEditorCache(contentId);
    if (cached && !options?.silent) {
      applyEditorPayload(cached, setters);
      setStatus("");
    } else if (!options?.silent && !cached) {
      setStatus("読み込み中…");
    }
    try {
      const treeEntry = entries.find((e) => e.snapshot.item.id === contentId);
      const isArticle = treeEntry?.snapshot.item.contentTypeKey === "article";
      const payload = await fetchContentEditorPayload(contentId, {
        isArticle: isArticle === true ? true : isArticle === false ? false : undefined,
      });
      applyEditorPayload(payload, setters);
      setStatus("");
      return payload.snapshot;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [session, contentId, entries]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!contentId) return;
    const cached = peekContentEditorCache(contentId);
    if (cached) {
      applyEditorPayload(cached, { setSnapshot, setArticleMeta, setPostedAtLocal, setTitle, setBlocks });
    }
  }, [contentId]);

  async function commitEditorState(changeSummary: string): Promise<ContentSnapshot | null> {
    if (!session || !snapshot?.workingRevision) return null;
    const document = writeTitleAndBlocks(snapshot.workingRevision.document, title, blocks);
    await apiFetch(`/v1/content/${encodeURIComponent(contentId)}/revisions`, {
      method: "POST",
      json: {
        baseRevisionId: snapshot.workingRevision.id,
        expectedLockVersion: snapshot.item.lockVersion,
        fields: { title },
        document,
        changeSummary,
      },
    });
    return load({ silent: true });
  }

  async function onSave() {
    if (!session || !snapshot?.workingRevision) return;
    setBusy(true);
    setStatus("保存中…");
    try {
      await commitEditorState("管理画面から編集");
      await reloadContentTree();
      const wasPublished = Boolean(snapshot.publishedRevision);
      setStatus(wasPublished ? "保存しました（サイトにはまだ反映されません）。" : "保存しました。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function openLivePublic(data: ContentSnapshot, showPublishedBanner: boolean) {
    if (!session || !data.publishedRevision) return;
    const url = buildPublicLiveUrl(resolvePublicSiteOrigin(session), data.route.path, { showPublishedBanner });
    openNamedBrowserTab(url, showPublishedBanner ? PUBLIC_LIVE_TAB : PUBLIC_VISITOR_TAB);
  }

  async function onPreviewDraft() {
    if (!session || !snapshot?.workingRevision) return;
    setBusy(true);
    setStatus("プレビュー準備中…");
    try {
      const dirty = snapshot.workingRevision
        ? isEditorDirty(snapshot.workingRevision.document, title, blocks)
        : true;
      let current = snapshot;
      if (dirty) {
        setStatus("入力中の内容を保存してプレビューします…");
        const next = await commitEditorState("プレビュー前の自動保存");
        if (!next?.workingRevision) throw new Error("下書きを保存できませんでした");
        current = next;
      }
      const result = await apiFetch<{ previewUrl: string }>(`/v1/content/${encodeURIComponent(contentId)}/previews`, {
        method: "POST",
        json: {
          revisionId: current.workingRevision!.id,
          previewBaseUrl: resolvePublicSiteOrigin(session),
        },
      });
      openNamedBrowserTab(result.previewUrl, PUBLIC_PREVIEW_TAB);
      setStatus(dirty ? "入力内容を保存し、下書きプレビューを開きました。" : "下書きプレビューを開きました。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!session || !snapshot) return;
    setBusy(true);
    setStatus("公開処理中…");
    try {
      if (snapshot.workingRevision && isEditorDirty(snapshot.workingRevision.document, title, blocks)) {
        await commitEditorState("管理画面から編集（公開前）");
      }
      const fresh = await apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(contentId)}`);
      await publishContent(contentId, fresh, session.credentialId);
      invalidateContentEditorCache(contentId);
      await load({ silent: true });
      await reloadContentTree();
      setStatus("公開しました。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onTrash() {
    if (!snapshot) return;
    const name = title.trim() || snapshot.route.path;
    if (!window.confirm(`「${name}」を削除（ゴミ箱へ移動）しますか？サイドバーの「ゴミ箱」から復元できます。`)) return;
    setBusy(true);
    setStatus("ゴミ箱へ移動しています…");
    try {
      await trashContent(snapshot);
      await reloadContentTree();
      navigate("/content");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onUnpublish() {
    if (!session || !snapshot?.publishedRevision) return;
    if (!window.confirm("公開を取り下げます。サイトの URL では表示されなくなります（下書きは残ります）。よろしいですか？")) return;
    setBusy(true);
    setStatus("公開を取り下げています…");
    try {
      await unpublishContent(contentId, session.credentialId);
      await load();
      await reloadContentTree();
      setStatus("公開を取り下げました。下書きは編集画面に残っています。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return <p className="status editor-empty">{status || "読み込み中…"}</p>;
  }

  const published = Boolean(snapshot.publishedRevision);
  const hasUnpublishedChanges =
    Boolean(snapshot.workingRevision)
    && snapshot.workingRevision!.id !== snapshot.publishedRevision?.id;
  const isDirty = snapshot.workingRevision
    ? isEditorDirty(snapshot.workingRevision.document, title, blocks)
    : false;
  const needsPublish = !published || hasUnpublishedChanges || isDirty;
  const editable = snapshot.item.contentTypeKey === "page" || snapshot.item.contentTypeKey === "article";
  const publishDisabled = !snapshot.workingRevision || busy;

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <div>
          <strong>{snapshot.route.path}</strong>
          <span className="badge" style={{ marginLeft: 8 }}>{snapshot.item.contentTypeKey}</span>
          <RevisionBadges published={published} hasUnpublishedChanges={hasUnpublishedChanges} isDirty={isDirty} />
        </div>
        <div className="toolbar editor-actions">
          {editable ? (
            <>
              <Button disabled={busy} onClick={() => void onSave()}>保存</Button>
              {published ? (
                <Button disabled={busy} onClick={() => void onUnpublish()} title="サイトから非表示にします">
                  公開を取り下げ
                </Button>
              ) : null}
              {needsPublish ? (
                <Button variant="primary" disabled={publishDisabled} onClick={() => void onPublish()} title={publishDisabled ? "下書きがありません" : undefined}>
                  公開
                </Button>
              ) : null}
              <Button variant="danger" disabled={busy} onClick={() => void onTrash()} title="サイトツリーから外し、ゴミ箱へ移動">
                削除（ゴミ箱へ）
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {editable ? (
        <p className="editor-secondary-actions">
          {published && !needsPublish ? (
            <>
              <Button variant="link" disabled={busy} onClick={() => openLivePublic(snapshot, true)}>公開を確認（バナー付き）</Button>
              <Button variant="link" disabled={busy} onClick={() => openLivePublic(snapshot, false)}>訪問者と同じ表示</Button>
            </>
          ) : null}
          {needsPublish ? (
            <Button variant="link" disabled={busy} onClick={() => void onPreviewDraft()}>下書きを確認</Button>
          ) : null}
        </p>
      ) : null}
      {editable ? (
        <p className="status editor-hint">
          保存は下書きのみ。サイトに出すには「公開」、「公開を取り下げ」でサイトから外せます。「削除（ゴミ箱へ）」でツリーから外せます（復元可）。
        </p>
      ) : null}
      <dl className="content-meta-dl">
        <div>
          <dt>作成日</dt>
          <dd>{formatDateTime(snapshot.item.createdAt)}</dd>
        </div>
        <div>
          <dt>更新日</dt>
          <dd>{formatDateTime(snapshot.item.updatedAt)}</dd>
        </div>
        {snapshot.workingRevision ? (
          <div>
            <dt>下書き更新</dt>
            <dd>{formatDateTime(snapshot.workingRevision.createdAt)}</dd>
          </div>
        ) : null}
        {snapshot.publishedRevision ? (
          <div>
            <dt>公開中バージョン</dt>
            <dd>{formatDateTime(snapshot.publishedRevision.createdAt)}</dd>
          </div>
        ) : null}
      </dl>
      {editable ? (
        <div className="editor-form">
          {snapshot.item.contentTypeKey === "article" && articleMeta ? (
            <Field label="投稿日時" hint="ブログ一覧・RSS の並びと表示に使われます。">
              <input
                type="datetime-local"
                value={postedAtLocal}
                onChange={(e) => setPostedAtLocal(e.target.value)}
                onBlur={() => {
                  if (!postedAtLocal || !articleMeta) return;
                  if (toDatetimeLocalValue(articleMeta.postedAt) === postedAtLocal) return;
                  void apiFetch<ArticleMeta>(`/v1/content/${encodeURIComponent(contentId)}/article-meta`, {
                    method: "PATCH",
                    json: { postedAt: parseDatetimeLocalValue(postedAtLocal) },
                  })
                    .then(async (meta) => {
                      setArticleMeta(meta);
                      setPostedAtLocal(toDatetimeLocalValue(meta.postedAt));
                      await reloadContentTree();
                    })
                    .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
                }}
              />
            </Field>
          ) : null}
          <Field label="タイトル" htmlFor="title">
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          {blocks.some((b) => b.kind === "image") ? (
            <PublicMediaDeliveryGuide className="public-media-guide-compact" />
          ) : null}
          <BlockEditor
            blocks={blocks}
            onChange={setBlocks}
            onPickImage={(index) => setImageInsertIndex(index)}
          />
        </div>
      ) : (
        <p className="status editor-empty">この種類のコンテンツは編集 UI 未対応です。</p>
      )}
      <StatusMessage message={status} error={status.includes("失敗") || status.includes("エラー")} />
      {imageInsertIndex !== null ? (
        <AssetPickerModal
          onClose={() => setImageInsertIndex(null)}
          onSelect={(assetId) => {
            const next = [...blocks];
            next.splice(imageInsertIndex, 0, { id: `img-${Date.now()}`, kind: "image", assetId, alt: "" });
            setBlocks(next);
            setImageInsertIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}
