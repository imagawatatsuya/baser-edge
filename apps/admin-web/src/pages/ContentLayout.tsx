import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useMatch, useNavigate } from "react-router-dom";
import { displayTitle } from "../lib/document";
import { useContentTree, ContentTreeProvider } from "../hooks/useContentTree";
import { ContentPageToolbar } from "./ContentPage";
import { PublicSiteLink } from "../components/PublicSiteLink";
import type { ContentSnapshot, ContentTreeEntry } from "../api/types";
import { Button } from "../components/ui/Button";
import {
  copyContent,
  CreateFolderModal,
  CreatePageModal,
  MoveContentModal,
  trashContent,
} from "../components/tree/TreeModals";
import { TreeRowMenu } from "../components/tree/TreeRowMenu";
import { applyReorderToContentTree, canDropOnFolder, reorderContentInTree } from "../lib/treeMove";
import { compareTreeEntries } from "../lib/treeSort";
import { formatDateTime } from "../lib/dates";
import { prefetchContentEditor } from "../lib/contentSnapshotCache";
import { isContentTreeEntryLiveOutOfSync } from "../lib/liveSiteOutOfSync";

const TYPE_LABEL: Record<string, string> = {
  folder: "フォルダ",
  page: "ページ",
  blog: "ブログ",
  article: "記事",
  alias: "エイリアス",
  "custom-content": "カスタムコンテンツ",
  "mail-form": "メールフォーム",
};

const COLLAPSED_TREE_STORAGE_KEY = "baseredge.console.contentTree.collapsed";

function typeIcon(key: string) {
  if (key === "folder") return "▣";
  if (key === "blog") return "B";
  if (key === "article") return "A";
  if (key === "page") return "▤";
  if (key === "alias") return "↪";
  if (key === "custom-content") return "C";
  if (key === "mail-form") return "M";
  return "·";
}

type DropTarget = ContentTreeEntry | "root";
type DropPosition = "before" | "after" | "inside" | "invalid";

interface DropIntent {
  targetId: string;
  targetParentId: string | null;
  insertAfterContentItemId: string | null;
  position: DropPosition;
  message: string;
  invalidReason?: string;
}

interface UndoReorder {
  contentItemId: string;
  targetParentId: string | null;
  insertAfterContentItemId: string | null;
}

interface TreeNotice {
  id: number;
  message: string;
  changedContentItemId?: string;
  undo?: UndoReorder;
}

const ARTICLE_MOVE_UNAVAILABLE =
  "記事は現在のブログ内でのみ並べ替えられます。別のブログへの移動は現在利用できません。";

function initialCollapsedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_TREE_STORAGE_KEY) ?? "[]");
    return new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function humanizeTreeError(error: unknown) {
  const domainCode = error instanceof Error
    ? (error as Error & { domainCode?: string }).domainCode
    : undefined;
  if (domainCode === "ARTICLE_CROSS_BLOG_MOVE_NOT_IMPLEMENTED") {
    return ARTICLE_MOVE_UNAVAILABLE;
  }
  return error instanceof Error ? error.message : String(error);
}

function publicationStatus(entry: ContentTreeEntry) {
  if (isContentTreeEntryLiveOutOfSync(entry)) {
    return { label: "本番未反映", className: "badge-warn" };
  }
  if (entry.snapshot.publishedRevision) {
    return { label: "公開中", className: "badge-published" };
  }
  if (entry.snapshot.workingRevision) {
    return { label: "下書き", className: "badge-draft" };
  }
  return { label: "未編集", className: "" };
}

export function ContentLayout() {
  const contentTree = useContentTree();
  const { entries, error, isReloading, reload, updateEntries } = contentTree;
  const contentId = useMatch("/content/:contentId")?.params.contentId;
  const overviewContentId = useMatch("/content/overview/:overviewContentId")?.params.overviewContentId;
  const navigate = useNavigate();
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<"page" | "folder" | null>(null);
  const [moveEntry, setMoveEntry] = useState<ContentTreeEntry | null>(null);
  const [treeError, setTreeError] = useState("");
  const [dragEntry, setDragEntry] = useState<ContentTreeEntry | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);
  const [pendingReorderId, setPendingReorderId] = useState<string | null>(null);
  const [treeNotice, setTreeNotice] = useState<TreeNotice | null>(null);
  const [treeQuery, setTreeQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState(initialCollapsedIds);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const reorderBusyRef = useRef(false);
  const noticeSequenceRef = useRef(0);

  const { byParent, entryById, entryByNodeId } = useMemo(() => {
    const byParent = new Map<string | "root", ContentTreeEntry[]>();
    for (const entry of entries) {
      const key = entry.snapshot.node.parentId ?? "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(entry);
    }
    for (const list of byParent.values()) {
      list.sort(compareTreeEntries);
    }
    const entryById = new Map(entries.map((e) => [e.snapshot.item.id, e]));
    const entryByNodeId = new Map(entries.map((e) => [e.snapshot.node.id, e]));
    return { byParent, entryById, entryByNodeId };
  }, [entries]);

  const visibleIds = useMemo(() => {
    const query = treeQuery.trim().toLocaleLowerCase();
    if (!query) return null;
    const visible = new Set<string>();
    for (const entry of entries) {
      const haystack = [
        displayTitle(entry),
        TYPE_LABEL[entry.snapshot.item.contentTypeKey] ?? entry.snapshot.item.contentTypeKey,
        entry.snapshot.route.path,
        entry.snapshot.node.slug,
      ].join("\n").toLocaleLowerCase();
      if (!haystack.includes(query)) continue;
      visible.add(entry.snapshot.item.id);
      let parentNodeId = entry.snapshot.node.parentId;
      while (parentNodeId) {
        const parent = entryByNodeId.get(parentNodeId);
        if (!parent) break;
        visible.add(parent.snapshot.item.id);
        parentNodeId = parent.snapshot.node.parentId;
      }
    }
    return visible;
  }, [entries, entryByNodeId, treeQuery]);

  const overviewEntry = overviewContentId ? entryById.get(overviewContentId) ?? null : null;
  const activeTreeId = overviewContentId ?? contentId ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_TREE_STORAGE_KEY, JSON.stringify([...collapsedIds]));
    } catch {
      // The tree remains usable when browser storage is unavailable.
    }
  }, [collapsedIds]);

  useEffect(() => {
    if (!treeNotice) return;
    const timeout = window.setTimeout(() => setTreeNotice(null), treeNotice.undo ? 8000 : 5000);
    return () => window.clearTimeout(timeout);
  }, [treeNotice]);

  useEffect(() => {
    if (!activeTreeId) return;
    const activeEntry = entryById.get(activeTreeId);
    if (!activeEntry) return;
    const ancestorIds: string[] = [];
    let parentNodeId = activeEntry.snapshot.node.parentId;
    while (parentNodeId) {
      const parent = entryByNodeId.get(parentNodeId);
      if (!parent) break;
      ancestorIds.push(parent.snapshot.item.id);
      parentNodeId = parent.snapshot.node.parentId;
    }
    if (!ancestorIds.length) return;
    setCollapsedIds((current) => {
      if (!ancestorIds.some((id) => current.has(id))) return current;
      const next = new Set(current);
      for (const id of ancestorIds) next.delete(id);
      return next;
    });
  }, [activeTreeId, entryById, entryByNodeId]);

  useEffect(() => {
    if (!activeTreeId) return;
    window.requestAnimationFrame(() => {
      rowRefs.current.get(activeTreeId)?.scrollIntoView({ block: "nearest" });
    });
  }, [activeTreeId, collapsedIds, entries.length, treeQuery]);

  async function onTrash(entry: ContentTreeEntry) {
    if (!window.confirm(`「${displayTitle(entry)}」を削除（ゴミ箱へ移動）しますか？`)) return;
    setTreeError("");
    try {
      await trashContent(entry.snapshot);
      await reload();
      if (contentId === entry.snapshot.item.id) navigate("/content");
      if (overviewContentId === entry.snapshot.item.id) navigate("/content");
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onCopy(entry: ContentTreeEntry) {
    const slug = window.prompt("コピーのスラッグ", `${entry.snapshot.node.slug}-copy`);
    if (!slug) return;
    setTreeError("");
    try {
      await copyContent(entry.snapshot, slug, entry.snapshot.node.parentId);
      await reload();
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    }
  }

  function sortedSiblings(parentKey: string | "root") {
    return [...(byParent.get(parentKey) ?? [])].sort(compareTreeEntries);
  }

  function showTreeNotice(notice: Omit<TreeNotice, "id">) {
    noticeSequenceRef.current += 1;
    setTreeNotice({ ...notice, id: noticeSequenceRef.current });
  }

  function previousSiblingId(entry: ContentTreeEntry) {
    const parentKey = entry.snapshot.node.parentId ?? "root";
    const siblings = sortedSiblings(parentKey);
    const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
    return index > 0 ? siblings[index - 1].snapshot.item.id : null;
  }

  function destinationPosition(
    movingContentItemId: string,
    targetParentId: string | null,
    insertAfterContentItemId: string | null,
  ) {
    const siblings = sortedSiblings(targetParentId ?? "root")
      .filter((item) => item.snapshot.item.id !== movingContentItemId);
    if (!insertAfterContentItemId) return 1;
    const anchorIndex = siblings.findIndex((item) => item.snapshot.item.id === insertAfterContentItemId);
    return anchorIndex >= 0 ? anchorIndex + 2 : siblings.length + 1;
  }

  function parentLabel(parentId: string | null) {
    if (!parentId) return "サイト直下";
    const parent = entryByNodeId.get(parentId);
    return parent ? `「${displayTitle(parent)}」` : "移動先";
  }

  function withinParentLabel(parentId: string | null) {
    return parentId ? `${parentLabel(parentId)}内` : parentLabel(parentId);
  }

  function successfulReorderMessage(
    entry: ContentTreeEntry,
    targetParentId: string | null,
    insertAfterContentItemId: string | null,
  ) {
    const position = destinationPosition(
      entry.snapshot.item.id,
      targetParentId,
      insertAfterContentItemId,
    );
    if (entry.snapshot.node.parentId === targetParentId) {
      const treeOnly = entry.snapshot.item.contentTypeKey === "article" ? "（管理ツリーのみ）" : "";
      return `「${displayTitle(entry)}」を${withinParentLabel(targetParentId)}の${position}番目へ並べ替えました${treeOnly}。`;
    }
    return `「${displayTitle(entry)}」を${parentLabel(targetParentId)}へ移動しました。`;
  }

  async function reorderEntry(
    entry: ContentTreeEntry,
    targetParentId: string | null,
    insertAfterContentItemId: string | null,
    options: { createUndo?: boolean; message?: string } = {},
  ): Promise<ContentSnapshot | null> {
    if (reorderBusyRef.current) return null;
    const previousParentId = entry.snapshot.node.parentId;
    const previousInsertAfterContentItemId = previousSiblingId(entry);
    if (
      previousParentId === targetParentId
      && previousInsertAfterContentItemId === insertAfterContentItemId
    ) {
      showTreeNotice({
        message: `「${displayTitle(entry)}」の位置は変わりませんでした。`,
        changedContentItemId: entry.snapshot.item.id,
      });
      return null;
    }

    reorderBusyRef.current = true;
    setPendingReorderId(entry.snapshot.item.id);
    setTreeError("");
    setTreeNotice(null);
    try {
      const next = await reorderContentInTree(
        entry.snapshot,
        targetParentId,
        insertAfterContentItemId,
      );
      updateEntries((current) => applyReorderToContentTree(
        current,
        entry.snapshot,
        next,
        targetParentId,
        insertAfterContentItemId,
      ));
      const canUndo = options.createUndo !== false && previousParentId === targetParentId;
      showTreeNotice({
        message: options.message
          ?? successfulReorderMessage(entry, targetParentId, insertAfterContentItemId),
        changedContentItemId: entry.snapshot.item.id,
        undo: canUndo ? {
          contentItemId: entry.snapshot.item.id,
          targetParentId: previousParentId,
          insertAfterContentItemId: previousInsertAfterContentItemId,
        } : undefined,
      });
      return next;
    } catch (error) {
      setTreeError(humanizeTreeError(error));
      return null;
    } finally {
      reorderBusyRef.current = false;
      setPendingReorderId(null);
    }
  }

  async function moveEntryUp(entry: ContentTreeEntry) {
    const parentKey = entry.snapshot.node.parentId ?? "root";
    const siblings = sortedSiblings(parentKey);
    const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
    if (index <= 0) return;
    const insertAfter = siblings[index - 2]?.snapshot.item.id ?? null;
    await reorderEntry(entry, entry.snapshot.node.parentId, insertAfter);
  }

  async function moveEntryDown(entry: ContentTreeEntry) {
    const parentKey = entry.snapshot.node.parentId ?? "root";
    const siblings = sortedSiblings(parentKey);
    const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
    if (index < 0 || index >= siblings.length - 1) return;
    await reorderEntry(entry, entry.snapshot.node.parentId, siblings[index + 1].snapshot.item.id);
  }

  async function moveEntryToParent(entry: ContentTreeEntry) {
    const parentId = entry.snapshot.node.parentId;
    if (!parentId) return;
    const parentEntry = entryByNodeId.get(parentId);
    if (!parentEntry) return;
    await reorderEntry(entry, parentEntry.snapshot.node.parentId, parentEntry.snapshot.item.id);
  }

  function invalidDropReason(entry: ContentTreeEntry, targetParentId: string | null) {
    const dragType = entry.snapshot.item.contentTypeKey;
    if (dragType === "article" && targetParentId !== entry.snapshot.node.parentId) {
      return ARTICLE_MOVE_UNAVAILABLE;
    }
    const parentType = targetParentId
      ? entryByNodeId.get(targetParentId)?.snapshot.item.contentTypeKey
      : "root";
    if (!parentType || !canDropOnFolder(dragType, parentType)) {
      return "この種類のコンテンツは、この場所へ移動できません。";
    }
    return null;
  }

  function buildContainerDropIntent(target: DropTarget): DropIntent | null {
    if (!dragEntry) return null;
    if (target !== "root" && target.snapshot.item.id === dragEntry.snapshot.item.id) return null;
    const targetParentId = target === "root" ? null : target.snapshot.node.id;
    const reason = invalidDropReason(dragEntry, targetParentId);
    const siblings = sortedSiblings(targetParentId ?? "root")
      .filter((entry) => entry.snapshot.item.id !== dragEntry.snapshot.item.id);
    const insertAfterContentItemId = siblings.at(-1)?.snapshot.item.id ?? null;
    const label = target === "root" ? "サイト直下" : `「${displayTitle(target)}」`;
    return {
      targetId: target === "root" ? "root" : target.snapshot.item.id,
      targetParentId,
      insertAfterContentItemId,
      position: reason ? "invalid" : "inside",
      message: reason ?? `${label}の末尾へ移動`,
      invalidReason: reason ?? undefined,
    };
  }

  function buildRowDropIntent(target: ContentTreeEntry, clientY: number, row: HTMLElement): DropIntent | null {
    if (!dragEntry || dragEntry.snapshot.item.id === target.snapshot.item.id) return null;
    const targetType = target.snapshot.item.contentTypeKey;
    if (targetType === "folder" || targetType === "blog") {
      return buildContainerDropIntent(target);
    }
    const targetParentId = target.snapshot.node.parentId;
    const reason = invalidDropReason(dragEntry, targetParentId);
    const siblings = sortedSiblings(targetParentId ?? "root")
      .filter((entry) => entry.snapshot.item.id !== dragEntry.snapshot.item.id);
    const targetIndex = siblings.findIndex((entry) => entry.snapshot.item.id === target.snapshot.item.id);
    const rect = row.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2;
    const insertAfterContentItemId = before
      ? siblings[targetIndex - 1]?.snapshot.item.id ?? null
      : target.snapshot.item.id;
    return {
      targetId: target.snapshot.item.id,
      targetParentId,
      insertAfterContentItemId,
      position: reason ? "invalid" : before ? "before" : "after",
      message: reason ?? `「${displayTitle(target)}」の${before ? "前" : "後"}へ移動`,
      invalidReason: reason ?? undefined,
    };
  }

  async function performDrop(intent: DropIntent | null) {
    if (!dragEntry || !intent) return;
    if (intent.invalidReason) {
      setTreeError(intent.invalidReason);
      setDragEntry(null);
      setDropIntent(null);
      return;
    }
    setDropIntent(null);
    await reorderEntry(
      dragEntry,
      intent.targetParentId,
      intent.insertAfterContentItemId,
    );
    setDragEntry(null);
  }

  function onDragOverRoot(e: React.DragEvent) {
    e.preventDefault();
    const intent = buildContainerDropIntent("root");
    e.dataTransfer.dropEffect = intent?.invalidReason ? "none" : "move";
    setDropIntent(intent);
  }

  async function undoLastReorder(undo: UndoReorder) {
    const current = entries.find((entry) => entry.snapshot.item.id === undo.contentItemId);
    if (!current) {
      setTreeNotice(null);
      setTreeError("元に戻す対象が見つかりません。ツリーを更新して確認してください。");
      return;
    }
    await reorderEntry(
      current,
      undo.targetParentId,
      undo.insertAfterContentItemId,
      {
        createUndo: false,
        message: `「${displayTitle(current)}」の並び順を元に戻しました。`,
      },
    );
  }

  function renderNodes(parentId: string | "root", depth: number) {
    const children = (byParent.get(parentId) ?? []).filter(
      (entry) => !visibleIds || visibleIds.has(entry.snapshot.item.id),
    );
    return children.map((entry) => {
      const id = entry.snapshot.item.id;
      const active = activeTreeId === id;
      const canEdit = entry.snapshot.item.contentTypeKey === "page" || entry.snapshot.item.contentTypeKey === "article";
      const aliasTarget = entry.aliasTargetContentItemId;
      const targetEntry = aliasTarget ? entryById.get(aliasTarget) : null;
      const aliasWarn = entry.snapshot.item.contentTypeKey === "alias" && targetEntry && !targetEntry.snapshot.publishedRevision;
      const isFolder = entry.snapshot.item.contentTypeKey === "folder";
      const isBlog = entry.snapshot.item.contentTypeKey === "blog";
      const droppable = isFolder || isBlog;
      const activeDropIntent = dropIntent?.targetId === id ? dropIntent : null;
      const siblings = sortedSiblings(parentId);
      const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
      const canMoveUp = index > 0;
      const canMoveDown = index >= 0 && index < siblings.length - 1;
      const articleMoveUnavailable = entry.snapshot.item.contentTypeKey === "article"
        ? "記事の別ブログへの移動は現在利用できません"
        : undefined;
      const canMoveToParent = Boolean(entry.snapshot.node.parentId) && !articleMoveUnavailable;
      const status = publicationStatus(entry);
      const hasChildren = (byParent.get(entry.snapshot.node.id)?.length ?? 0) > 0;
      const collapsed = collapsedIds.has(id);
      const title = displayTitle(entry);
      return (
        <li
          key={id}
          ref={(node) => {
            if (node) rowRefs.current.set(id, node);
            else rowRefs.current.delete(id);
          }}
          className="tree-item"
          data-tree-entry-id={id}
        >
          <div
            className={[
              "tree-row",
              active ? "active" : "",
              pendingReorderId === id ? "tree-row-pending" : "",
              treeNotice?.changedContentItemId === id ? "tree-row-updated" : "",
              activeDropIntent ? `tree-drop-${activeDropIntent.position}` : "",
            ].filter(Boolean).join(" ")}
            style={{ paddingLeft: depth * 12 }}
            aria-busy={pendingReorderId === id || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              const intent = buildRowDropIntent(entry, e.clientY, e.currentTarget);
              e.dataTransfer.dropEffect = intent?.invalidReason ? "none" : "move";
              setDropIntent(intent);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIntent(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const intent = droppable
                ? buildContainerDropIntent(entry)
                : buildRowDropIntent(entry, e.clientY, e.currentTarget);
              void performDrop(intent);
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="tree-disclosure"
                aria-label={`${title}を${collapsed ? "展開" : "折りたたむ"}`}
                aria-expanded={!collapsed}
                onClick={() => {
                  setCollapsedIds((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              >
                <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
              </button>
            ) : <span className="tree-disclosure-spacer" aria-hidden />}
            <button
              type="button"
              className="tree-drag-handle"
              draggable={!pendingReorderId}
              disabled={Boolean(pendingReorderId)}
              title={`${title}をドラッグして並べ替え`}
              aria-label={`${title}をドラッグして並べ替え`}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setTreeError("");
                setTreeNotice(null);
                setDragEntry(entry);
              }}
              onDragEnd={() => { setDragEntry(null); setDropIntent(null); }}
            >
              ⠿
            </button>
            <button
              type="button"
              className={`tree-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={`${title}、${TYPE_LABEL[entry.snapshot.item.contentTypeKey] ?? entry.snapshot.item.contentTypeKey}、${status.label}`}
              onClick={() => {
                if (canEdit) {
                  navigate(`/content/${id}`);
                } else {
                  navigate(`/content/overview/${id}`);
                }
              }}
              onPointerEnter={() => {
                if (canEdit) prefetchContentEditor(id, entry.snapshot.item.contentTypeKey === "article");
              }}
              onPointerDown={() => {
                if (canEdit) prefetchContentEditor(id, entry.snapshot.item.contentTypeKey === "article");
              }}
              onFocus={() => {
                if (canEdit) prefetchContentEditor(id, entry.snapshot.item.contentTypeKey === "article");
              }}
            >
              <span className="tree-icon" aria-hidden>{typeIcon(entry.snapshot.item.contentTypeKey)}</span>
              <span className="tree-link-copy">
                <span className="tree-link-title" title={title}>{title}</span>
                <span className="tree-meta">
                  <span>{TYPE_LABEL[entry.snapshot.item.contentTypeKey] ?? entry.snapshot.item.contentTypeKey}</span>
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </span>
              </span>
            </button>
            <TreeRowMenu
              entry={entry}
              onAddPage={() => { setCreateParentId(entry.snapshot.node.id); setCreateKind("page"); }}
              onAddFolder={() => { setCreateParentId(entry.snapshot.node.id); setCreateKind("folder"); }}
              onMoveUp={() => void moveEntryUp(entry)}
              onMoveDown={() => void moveEntryDown(entry)}
              onMoveToParent={() => void moveEntryToParent(entry)}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              canMoveToParent={canMoveToParent}
              moveUnavailableReason={articleMoveUnavailable}
              disabled={Boolean(pendingReorderId)}
              onMove={() => setMoveEntry(entry)}
              onCopy={() => void onCopy(entry)}
              onTrash={() => void onTrash(entry)}
            />
          </div>
          {aliasWarn ? <p className="tree-warn">参照先が未公開です</p> : null}
          {hasChildren && (!collapsed || visibleIds) ? (
            <ul className="tree-list tree-children">{renderNodes(entry.snapshot.node.id, depth + 1)}</ul>
          ) : null}
        </li>
      );
    });
  }

  return (
    <ContentTreeProvider value={contentTree}>
    <div className="page content-layout">
      <div className="page-header">
        <div>
          <h1>コンテンツ</h1>
          <p>項目を選んで編集または概要を確認できます。並べ替えや削除は各項目の操作メニューから行います。</p>
        </div>
        <div className="toolbar">
          <PublicSiteLink className="btn">公開サイト（ホーム）</PublicSiteLink>
          <Button onClick={() => { setCreateParentId(null); setCreateKind("page"); }}>ページ</Button>
          <Button onClick={() => { setCreateParentId(null); setCreateKind("folder"); }}>フォルダ</Button>
          <ContentPageToolbar onRefresh={() => void reload()} />
        </div>
      </div>
      <div className="split content-split">
        <div className="panel tree-panel content-tree-panel">
          <div
            className={[
              "panel-head",
              "tree-panel-head",
              dropIntent?.targetId === "root" ? `tree-drop-${dropIntent.position}` : "",
            ].filter(Boolean).join(" ")}
            onDragOver={onDragOverRoot}
            onDragLeave={() => setDropIntent(null)}
            onDrop={(e) => {
              e.preventDefault();
              void performDrop(buildContainerDropIntent("root"));
            }}
          >
            <span>サイトツリー</span>
            <span className="tree-head-note">空白へドロップするとルートへ移動</span>
            {isReloading ? <span className="tree-reload-indicator">更新中…</span> : null}
          </div>
          {pendingReorderId ? (
            <p className="tree-drop-feedback" role="status" aria-live="polite">
              並べ替えを保存しています…
            </p>
          ) : dropIntent ? (
            <p
              className={`tree-drop-feedback ${dropIntent.invalidReason ? "tree-drop-feedback-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {dropIntent.message}
            </p>
          ) : null}
          <div className="tree-search">
            <label htmlFor="content-tree-search">ツリーを検索</label>
            <div className="tree-search-control">
              <input
                id="content-tree-search"
                type="search"
                value={treeQuery}
                onChange={(event) => setTreeQuery(event.target.value)}
                placeholder="タイトル、種別、URL"
              />
              {treeQuery ? (
                <button type="button" onClick={() => setTreeQuery("")} aria-label="ツリー検索をクリア">クリア</button>
              ) : null}
            </div>
          </div>
          <p className="tree-order-note">
            ここでの並べ替えは管理ツリー内の表示順です。ブログの公開記事一覧は、投稿日時とブログ設定の表示順で決まります。
          </p>
          <ul className="tree-list content-tree-list" aria-label="サイトツリー">{renderNodes("root", 0)}</ul>
          {visibleIds && visibleIds.size === 0 ? <p className="tree-empty">一致するコンテンツはありません。</p> : null}
          {treeNotice ? (
            <div key={treeNotice.id} className="tree-status">
              <span role="status" aria-live="polite">{treeNotice.message}</span>
              {treeNotice.undo ? (
                <button type="button" onClick={() => void undoLastReorder(treeNotice.undo!)}>元に戻す</button>
              ) : null}
            </div>
          ) : null}
          {treeError ? <p className="tree-status tree-status-error" role="alert">{treeError}</p> : null}
        </div>
        <div className="panel editor-panel">
          {overviewEntry ? (
            <ContentTreeEntryOverview
              entry={overviewEntry}
              parent={overviewEntry.snapshot.node.parentId ? entryByNodeId.get(overviewEntry.snapshot.node.parentId) ?? null : null}
              onAddPage={() => { setCreateParentId(overviewEntry.snapshot.node.id); setCreateKind("page"); }}
              onAddFolder={() => { setCreateParentId(overviewEntry.snapshot.node.id); setCreateKind("folder"); }}
              onMove={() => setMoveEntry(overviewEntry)}
            />
          ) : <Outlet />}
        </div>
      </div>
      {error ? <p className="status status-error">{error}</p> : null}
      {createKind === "page" ? (
        <CreatePageModal parentId={createParentId} onClose={() => setCreateKind(null)} onCreated={() => { setCreateKind(null); void reload(); }} />
      ) : null}
      {createKind === "folder" ? (
        <CreateFolderModal parentId={createParentId} onClose={() => setCreateKind(null)} onCreated={() => { setCreateKind(null); void reload(); }} />
      ) : null}
      {moveEntry ? (
        <MoveContentModal entry={moveEntry} tree={entries} onClose={() => setMoveEntry(null)} onMoved={() => { setMoveEntry(null); void reload(); }} />
      ) : null}
    </div>
    </ContentTreeProvider>
  );
}

export function ContentIndexPlaceholder() {
  return (
    <div className="editor-empty">
      <p>左のツリーからコンテンツを選択してください。ページと記事は編集画面、その他の種別は概要を表示します。</p>
      <p>
        <PublicSiteLink className="btn btn-primary">公開サイトのホームを見る</PublicSiteLink>
      </p>
    </div>
  );
}

function ContentTreeEntryOverview({
  entry,
  parent,
  onAddPage,
  onAddFolder,
  onMove,
}: {
  entry: ContentTreeEntry;
  parent: ContentTreeEntry | null;
  onAddPage: () => void;
  onAddFolder: () => void;
  onMove: () => void;
}) {
  const navigate = useNavigate();
  const title = displayTitle(entry);
  const type = entry.snapshot.item.contentTypeKey;
  const status = publicationStatus(entry);
  const isFolder = type === "folder";
  const isBlog = type === "blog";

  return (
    <section className="tree-entry-overview" aria-labelledby="tree-entry-overview-title">
      <div className="tree-entry-overview-head">
        <div>
          <p className="tree-entry-eyebrow">{TYPE_LABEL[type] ?? type}</p>
          <h2 id="tree-entry-overview-title">{title}</h2>
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>
      <dl className="tree-entry-details">
        <div><dt>公開パス</dt><dd><code>{entry.snapshot.route.path}</code></dd></div>
        <div><dt>親</dt><dd>{parent ? displayTitle(parent) : "サイト直下"}</dd></div>
        <div><dt>更新日時</dt><dd><time dateTime={new Date(entry.snapshot.item.updatedAt).toISOString()}>{formatDateTime(entry.snapshot.item.updatedAt)}</time></dd></div>
        <div><dt>スラッグ</dt><dd><code>{entry.snapshot.node.slug}</code></dd></div>
      </dl>
      <div className="tree-entry-overview-actions">
        {isFolder ? (
          <>
            <Button onClick={onAddPage}>このフォルダにページを追加</Button>
            <Button onClick={onAddFolder}>このフォルダにフォルダを追加</Button>
          </>
        ) : null}
        {type === "custom-content" ? <Button onClick={() => navigate("/custom")}>カスタムコンテンツ管理を開く</Button> : null}
        {type === "mail-form" ? <Button onClick={() => navigate("/mail")}>メールフォーム管理を開く</Button> : null}
        <Button onClick={onMove}>移動先を選ぶ</Button>
      </div>
      {isBlog ? <p className="tree-entry-guidance">記事の作成は画面上部の「記事を追加」から行えます。</p> : null}
      {!isFolder && !isBlog ? <p className="tree-entry-guidance">この種別の位置と公開状態を確認できます。利用可能な操作はツリー行のメニューにまとまっています。</p> : null}
    </section>
  );
}
