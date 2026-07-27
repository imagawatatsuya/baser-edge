import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, publishContent, unpublishContent } from "../api/client";
import type { ArticleMeta, ContentSnapshot } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { AssetPickerModal } from "../components/AssetPickerModal";
import { BlockEditor } from "../components/BlockEditor";
import { DraftOnlySaveModal } from "../components/DraftOnlySaveModal";
import { EditorLeaveDialog } from "../components/EditorLeaveDialog";
import { PublicMediaDeliveryGuide } from "../components/PublicMediaDeliveryGuide";
import { RevisionBadges } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useEditorLeaveGuard } from "../hooks/useEditorLeaveGuard";
import { computeEditorSyncState, editorLeaveDialogMode } from "../lib/contentEditorSync";
import { resolvePublicSiteOrigin } from "../lib/localDevUrls";
import { isEditorDirty, readTitleAndBlocks, validateEditorBlocks, writeTitleAndBlocks, type BodyBlock } from "../lib/blocks";
import type { Revision } from "../api/types";
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
  peekContentEditorCache,
  setContentEditorCache,
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
  const { reload: reloadContentTree } = useContentTreeContext();
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<BodyBlock[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageInsertIndex, setImageInsertIndex] = useState<number | null>(null);
  const [articleMeta, setArticleMeta] = useState<ArticleMeta | null>(null);
  const [postedAtLocal, setPostedAtLocal] = useState("");
  const [draftOnlyModalOpen, setDraftOnlyModalOpen] = useState(false);

  const editable = snapshot?.item.contentTypeKey === "page" || snapshot?.item.contentTypeKey === "article";
  const syncState = snapshot
    ? computeEditorSyncState(snapshot, title, blocks)
    : null;
  const guardWhen = Boolean(editable && syncState?.shouldBlockNavigation);
  const { blocker, proceedLeave, cancelBlockedNavigation } = useEditorLeaveGuard(guardWhen);
  const leaveDialogOpen = blocker.state === "blocked";
  const leaveDialogMode = syncState ? editorLeaveDialogMode(syncState) : "unsaved" as const;

  const load = useCallback(async (options?: { silent?: boolean; fresh?: boolean }): Promise<ContentSnapshot | null> => {
    if (!session || !contentId) return null;
    const setters = { setSnapshot, setArticleMeta, setPostedAtLocal, setTitle, setBlocks };
    const cached = options?.fresh ? null : peekContentEditorCache(contentId);
    if (cached && !options?.silent) {
      applyEditorPayload(cached, setters);
      setStatus("");
    } else if (!options?.silent && !cached) {
      setStatus("読み込み中…");
    }
    try {
      const typeHint = cached?.snapshot.item.contentTypeKey ?? peekContentEditorCache(contentId)?.snapshot.item.contentTypeKey;
      const isArticle = typeHint === "article" ? true : typeHint === "page" ? false : undefined;
      const payload = await fetchContentEditorPayload(contentId, {
        isArticle,
        fresh: options?.fresh,
      });
      applyEditorPayload(payload, setters);
      setStatus("");
      return payload.snapshot;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [session, contentId]);

  function syncEditorFromSnapshot(next: ContentSnapshot, meta: ArticleMeta | null = articleMeta) {
    const payload = { snapshot: next, articleMeta: meta };
    applyEditorPayload(payload, { setSnapshot, setArticleMeta, setPostedAtLocal, setTitle, setBlocks });
    setContentEditorCache(contentId, payload);
  }

  useEffect(() => { void load({ fresh: true }); }, [load]);

  function editorValidationError(): string | null {
    return validateEditorBlocks(blocks);
  }

  async function commitEditorState(changeSummary: string): Promise<ContentSnapshot | null> {
    if (!session || !snapshot?.workingRevision) return null;
    const validationError = editorValidationError();
    if (validationError) throw new Error(validationError);
    const document = writeTitleAndBlocks(snapshot.workingRevision.document, title, blocks);
    const revision = await apiFetch<Revision>(`/v1/content/${encodeURIComponent(contentId)}/revisions`, {
      method: "POST",
      json: {
        baseRevisionId: snapshot.workingRevision.id,
        expectedLockVersion: snapshot.item.lockVersion,
        fields: { title },
        document,
        changeSummary,
      },
    });
    const next = await load({ silent: true, fresh: true });
    if (next) return next;
    return {
      ...snapshot,
      item: { ...snapshot.item, lockVersion: snapshot.item.lockVersion + 1 },
      workingRevision: revision,
    };
  }

  async function publishLiveWorkflow(): Promise<boolean> {
    if (!session || !snapshot) return false;
    const validationError = editorValidationError();
    if (validationError) {
      setStatus(validationError);
      return false;
    }
    setBusy(true);
    setStatus("サイトに反映しています…");
    try {
      if (snapshot.workingRevision && isEditorDirty(snapshot.workingRevision.document, title, blocks)) {
        await commitEditorState("管理画面から編集（公開反映前）");
      }
      const fresh = await apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(contentId)}`);
      const publishedSnap = await publishContent(contentId, fresh, session.credentialId);
      flushSync(() => syncEditorFromSnapshot(publishedSnap));
      await reloadContentTree();
      setStatus("サイトに反映しました。");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function discardUnsavedEditorInput() {
    if (!snapshot?.workingRevision) return;
    const parsed = readTitleAndBlocks(snapshot.workingRevision.document);
    setTitle(parsed.title || String(snapshot.workingRevision.fields.title ?? ""));
    setBlocks(parsed.blocks);
  }

  function finishBlockedNavigation(options?: { force?: boolean }) {
    proceedLeave(options);
  }

  async function onSaveDraftOnly() {
    if (!session) return;
    if (!snapshot?.workingRevision) {
      setStatus("下書きリビジョンがありません。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    setStatus("下書きを保存中…");
    try {
      if (syncState?.isDirty) {
        await commitEditorState("管理画面から編集（下書きのみ）");
      }
      await reloadContentTree();
      setStatus("下書きのみ保存しました。公開サイトはまだ古い版です。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!session) return;
    if (!snapshot?.workingRevision) {
      setStatus("下書きリビジョンがありません。ページを再読み込みしてください。");
      return;
    }
    if (syncState?.published) {
      setDraftOnlyModalOpen(true);
      return;
    }
    setBusy(true);
    setStatus("保存中…");
    try {
      await commitEditorState("管理画面から編集");
      await reloadContentTree();
      setStatus("保存しました。");
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
    if (!session) return;
    if (!snapshot?.workingRevision) {
      setStatus("下書きリビジョンがありません。ページを再読み込みしてください。");
      return;
    }
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
    await publishLiveWorkflow();
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
      proceedLeave({ force: true });
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
      const unpublished = await unpublishContent(contentId, session.credentialId);
      syncEditorFromSnapshot(unpublished);
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

  const published = syncState?.published ?? false;
  const hasUnpublishedChanges = syncState?.hasUnpublishedChanges ?? false;
  const isDirty = syncState?.isDirty ?? false;
  const liveSiteOutOfSync = syncState?.liveSiteOutOfSync ?? false;
  const needsPublish = !published || hasUnpublishedChanges || isDirty;
  const publishDisabled = !snapshot.workingRevision || busy;
  const publishLabel = published ? "サイトに反映" : "公開";

  return (
    <div className="editor-shell">
      {liveSiteOutOfSync ? (
        <div className="editor-live-stale-banner" role="alert">
          <strong>公開サイトはまだ古い版です。</strong>
          訪問者に見える内容を変えるには「{publishLabel}」が必要です。下書きのみ保存では本番は変わりません。
        </div>
      ) : null}
      <div className="editor-toolbar">
        <div>
          <strong>{snapshot.route.path}</strong>
          <span className="badge" style={{ marginLeft: 8 }}>{snapshot.item.contentTypeKey}</span>
          <RevisionBadges published={published} hasUnpublishedChanges={hasUnpublishedChanges} isDirty={isDirty} />
        </div>
        <div className="toolbar editor-actions">
          {editable ? (
            <>
              {!published ? (
                <Button disabled={busy} onClick={() => void onSave()}>保存</Button>
              ) : (
                <Button disabled={busy || !isDirty} onClick={() => setDraftOnlyModalOpen(true)} title="公開サイトは更新されません">
                  下書きのみ保存…
                </Button>
              )}
              {published ? (
                <Button disabled={busy} onClick={() => void onUnpublish()} title="サイトから非表示にします">
                  公開を取り下げ
                </Button>
              ) : null}
              {needsPublish ? (
                <Button variant="primary" disabled={publishDisabled} onClick={() => void onPublish()} title={publishDisabled ? "下書きがありません" : undefined}>
                  {publishLabel}
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
          {published
            ? "公開済みのページは「サイトに反映」で訪問者向け表示を更新します。「下書きのみ保存」は本番を変えません。"
            : "保存は下書きのみ。サイトに出すには「公開」。"}
          「公開を取り下げ」でサイトから外せます。「削除（ゴミ箱へ）」でツリーから外せます（復元可）。
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
      <StatusMessage
        message={status}
        error={
          status.includes("失敗")
          || status.includes("エラー")
          || status.includes("ください")
          || /^[A-Z][A-Z0-9_]+:/.test(status)
        }
      />
      {imageInsertIndex !== null ? (
        <AssetPickerModal
          onClose={() => setImageInsertIndex(null)}
          onSelect={(assetId) => {
            const next = [...blocks];
            next.splice(imageInsertIndex, 0, { id: `img-${Date.now()}`, kind: "image", assetId, alt: "", decorative: true });
            setBlocks(next);
            setImageInsertIndex(null);
          }}
        />
      ) : null}
      <DraftOnlySaveModal
        open={draftOnlyModalOpen}
        busy={busy}
        onCancel={() => setDraftOnlyModalOpen(false)}
        onConfirm={() => {
          setDraftOnlyModalOpen(false);
          void onSaveDraftOnly();
        }}
      />
      <EditorLeaveDialog
        open={leaveDialogOpen}
        mode={leaveDialogMode}
        busy={busy}
        published={published}
        needsCommit={isDirty}
        onCancel={() => cancelBlockedNavigation()}
        onSaveAndPublishLive={() => {
          void (async () => {
            const ok = await publishLiveWorkflow();
            if (ok) finishBlockedNavigation();
          })();
        }}
        onPublishLive={() => {
          void (async () => {
            const ok = await publishLiveWorkflow();
            if (ok) finishBlockedNavigation();
          })();
        }}
        onSaveDraftOnly={() => {
          void (async () => {
            await onSaveDraftOnly();
            finishBlockedNavigation({ force: true });
          })();
        }}
        onDiscard={() => {
          flushSync(() => discardUnsavedEditorInput());
          finishBlockedNavigation();
        }}
        onLeaveWithStaleLive={() => {
          finishBlockedNavigation({ force: true });
        }}
      />
    </div>
  );
}
