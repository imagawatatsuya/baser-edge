import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useMatch, useNavigate } from "react-router-dom";
import { displayTitle } from "../lib/document";
import { useContentTree, ContentTreeProvider } from "../hooks/useContentTree";
import { ContentPageToolbar } from "./ContentPage";
import { PublicSiteLink } from "../components/PublicSiteLink";
import type { ContentTreeEntry } from "../api/types";
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

function initialCollapsedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_TREE_STORAGE_KEY) ?? "[]");
    return new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
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
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);
  const [treeAnnounce, setTreeAnnounce] = useState("");
  const [treeQuery, setTreeQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState(initialCollapsedIds);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

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

  async function reorderEntry(
    entry: ContentTreeEntry,
    targetParentId: string | null,
    insertAfterContentItemId: string | null,
  ) {
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
  }

  async function moveEntryUp(entry: ContentTreeEntry) {
    const parentKey = entry.snapshot.node.parentId ?? "root";
    const siblings = sortedSiblings(parentKey);
    const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
    if (index <= 0) return;
    setTreeError("");
    try {
      const insertAfter = siblings[index - 2]?.snapshot.item.id ?? null;
      await reorderEntry(entry, entry.snapshot.node.parentId, insertAfter);
      setTreeAnnounce(`${displayTitle(entry)}を上へ移動しました`);
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    }
  }

  async function moveEntryDown(entry: ContentTreeEntry) {
    const parentKey = entry.snapshot.node.parentId ?? "root";
    const siblings = sortedSiblings(parentKey);
    const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
    if (index < 0 || index >= siblings.length - 1) return;
    setTreeError("");
    try {
      await reorderEntry(entry, entry.snapshot.node.parentId, siblings[index + 1].snapshot.item.id);
      setTreeAnnounce(`${displayTitle(entry)}を下へ移動しました`);
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    }
  }

  async function moveEntryToParent(entry: ContentTreeEntry) {
    const parentId = entry.snapshot.node.parentId;
    if (!parentId) return;
    const parentEntry = entryByNodeId.get(parentId);
    if (!parentEntry) return;
    setTreeError("");
    try {
      await reorderEntry(entry, parentEntry.snapshot.node.parentId, parentEntry.snapshot.item.id);
      setTreeAnnounce(`${displayTitle(entry)}を親フォルダの直後へ移動しました`);
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    }
  }

  async function performDrop(target: DropTarget) {
    if (!dragEntry) return;
    const dragType = dragEntry.snapshot.item.contentTypeKey;
    const targetType = target === "root" ? "root" : target.snapshot.item.contentTypeKey;
    if (!canDropOnFolder(dragType, targetType)) {
      setTreeError("この場所には移動できません。");
      return;
    }
    if (target !== "root" && target.snapshot.item.id === dragEntry.snapshot.item.id) return;
    setTreeError("");
    try {
      const targetParentId = target === "root" ? null : target.snapshot.node.id;
      const parentKey = targetParentId ?? "root";
      const siblings = (byParent.get(parentKey) ?? []).filter((e) => e.snapshot.item.id !== dragEntry.snapshot.item.id);
      const last = [...siblings].sort(compareTreeEntries).at(-1)?.snapshot.item.id ?? null;
      await reorderEntry(dragEntry, targetParentId, last);
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    } finally {
      setDragEntry(null);
      setDropHighlight(null);
    }
  }

  async function handleRowDrop(target: ContentTreeEntry) {
    if (!dragEntry || dragEntry.snapshot.item.id === target.snapshot.item.id) return;
    const targetType = target.snapshot.item.contentTypeKey;
    setTreeError("");
    try {
      if (targetType === "folder" || targetType === "blog") {
        const kids = (byParent.get(target.snapshot.node.id) ?? []).filter((e) => e.snapshot.item.id !== dragEntry.snapshot.item.id);
        const last = [...kids].sort(compareTreeEntries).at(-1)?.snapshot.item.id ?? null;
        await reorderEntry(dragEntry, target.snapshot.node.id, last);
      } else {
        await reorderEntry(
          dragEntry,
          target.snapshot.node.parentId,
          target.snapshot.item.id,
        );
      }
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    } finally {
      setDragEntry(null);
      setDropHighlight(null);
    }
  }

  function markDropTarget(id: string) {
    setDropHighlight((prev) => (prev === id ? prev : id));
  }

  function onDragOverTarget(id: string, e: React.DragEvent) {
    e.preventDefault();
    markDropTarget(id);
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
      const highlight = dropHighlight === id;
      const siblings = sortedSiblings(parentId);
      const index = siblings.findIndex((item) => item.snapshot.item.id === entry.snapshot.item.id);
      const canMoveUp = index > 0;
      const canMoveDown = index >= 0 && index < siblings.length - 1;
      const canMoveToParent = Boolean(entry.snapshot.node.parentId);
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
            className={`tree-row ${active ? "active" : ""} ${highlight ? "tree-drop-target" : ""}`}
            style={{ paddingLeft: depth * 12 }}
            onDragOver={(e) => { e.preventDefault(); markDropTarget(id); }}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (droppable) void performDrop(entry);
              else void handleRowDrop(entry);
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
              draggable
              title={`${title}をドラッグして並べ替え`}
              aria-label={`${title}をドラッグして並べ替え`}
              onDragStart={() => setDragEntry(entry)}
              onDragEnd={() => { setDragEntry(null); setDropHighlight(null); }}
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
            className={`panel-head tree-panel-head ${dropHighlight === "root" ? "tree-drop-target" : ""}`}
            onDragOver={(e) => onDragOverTarget("root", e)}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={(e) => { e.preventDefault(); void performDrop("root"); }}
          >
            <span>サイトツリー</span>
            <span className="tree-head-note">空白へドロップするとルートへ移動</span>
            {isReloading ? <span className="tree-reload-indicator">更新中…</span> : null}
          </div>
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
          <ul className="tree-list content-tree-list" aria-label="サイトツリー">{renderNodes("root", 0)}</ul>
          {visibleIds && visibleIds.size === 0 ? <p className="tree-empty">一致するコンテンツはありません。</p> : null}
          {treeAnnounce ? <p className="tree-status" role="status" aria-live="polite">{treeAnnounce}</p> : null}
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
      {error || treeError ? <p className="status status-error">{error || treeError}</p> : null}
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
