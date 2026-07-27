import type { ContentSnapshot } from "../api/types";
import { isEditorDirty, type BodyBlock } from "./blocks";

export type EditorSyncState = {
  published: boolean;
  isDirty: boolean;
  /** エディタが訪問者向け公開リビジョンと異なる */
  differsFromPublished: boolean;
  hasUnpublishedChanges: boolean;
  /** 公開サイトの表示とエディタ（下書き）が一致していない */
  liveSiteOutOfSync: boolean;
  /** 離脱ブロック（未公開下書きの未保存、または公開済みで公開版とエディタが異なる） */
  shouldBlockNavigation: boolean;
};

export function computeEditorSyncState(
  snapshot: ContentSnapshot,
  title: string,
  blocks: BodyBlock[],
): EditorSyncState {
  const published = Boolean(snapshot.publishedRevision);
  const isDirty = snapshot.workingRevision
    ? isEditorDirty(snapshot.workingRevision.document, title, blocks)
    : false;
  const differsFromPublished =
    published && snapshot.publishedRevision
      ? isEditorDirty(snapshot.publishedRevision.document, title, blocks)
      : false;
  const hasUnpublishedChanges =
    Boolean(snapshot.workingRevision)
    && snapshot.workingRevision!.id !== snapshot.publishedRevision?.id;
  const liveSiteOutOfSync = published && (hasUnpublishedChanges || differsFromPublished);
  const shouldBlockNavigation =
    (!published && isDirty) ||
    (published && differsFromPublished);
  return {
    published,
    isDirty,
    differsFromPublished,
    hasUnpublishedChanges,
    liveSiteOutOfSync,
    shouldBlockNavigation,
  };
}

/** @deprecated use sync.shouldBlockNavigation (published articles compare to published revision) */
export function shouldBlockEditorLeave(
  sync: Pick<EditorSyncState, "shouldBlockNavigation">,
  sessionEdited: boolean,
): boolean {
  return sync.shouldBlockNavigation || sessionEdited;
}

export function editorLeaveDialogMode(
  sync: Pick<EditorSyncState, "isDirty" | "published" | "differsFromPublished">,
): "unsaved" | "live-stale" {
  if (!sync.published) return sync.isDirty ? "unsaved" : "live-stale";
  if (sync.isDirty) return "unsaved";
  return "live-stale";
}

/** 公開済みで下書きのみ保存する前に、操作者が明示する文言 */
export const LIVE_SITE_STALE_ACK_PHRASE = "本番は更新しない";

export function liveSiteStaleAckValid(input: string): boolean {
  return input.trim() === LIVE_SITE_STALE_ACK_PHRASE;
}

export type CustomEntrySyncSnapshot = {
  entry: { lockVersion: number };
  workingRevision: { id: string; values: Record<string, unknown> };
  publishedRevision: { id: string } | null;
};

export function customEntryValuesDirty(workingValues: Record<string, unknown>, edited: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(workingValues), ...Object.keys(edited)]);
  for (const key of keys) {
    const raw = workingValues[key];
    const normalized = typeof raw === "string" ? raw : String(raw ?? "");
    if (normalized !== (edited[key] ?? "")) return true;
  }
  return false;
}

export function computeCustomEntrySyncState(
  snapshot: CustomEntrySyncSnapshot,
  values: Record<string, string>,
): EditorSyncState {
  const published = Boolean(snapshot.publishedRevision);
  const isDirty = customEntryValuesDirty(snapshot.workingRevision.values, values);
  const hasUnpublishedChanges =
    snapshot.workingRevision.id !== snapshot.publishedRevision?.id;
  const liveSiteOutOfSync = published && (hasUnpublishedChanges || isDirty);
  const shouldBlockNavigation =
    (!published && isDirty) ||
    (published && (isDirty || hasUnpublishedChanges));
  return {
    published,
    isDirty,
    differsFromPublished: published && (isDirty || hasUnpublishedChanges),
    hasUnpublishedChanges,
    liveSiteOutOfSync,
    shouldBlockNavigation,
  };
}
