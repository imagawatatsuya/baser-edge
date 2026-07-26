import { useMemo, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { displayTitle } from "../lib/document";
import { useContentTree } from "../hooks/useContentTree";
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
import { canDropOnFolder, reorderContentInTree } from "../lib/treeMove";
import { compareTreeEntries } from "../lib/treeSort";
import { formatDateTime } from "../lib/dates";

const TYPE_LABEL: Record<string, string> = {
  folder: "フォルダ",
  page: "ページ",
  blog: "ブログ",
  article: "記事",
  alias: "エイリアス",
};

function typeIcon(key: string) {
  if (key === "folder") return "▾";
  if (key === "blog") return "B";
  if (key === "article") return "A";
  if (key === "page") return "▤";
  if (key === "alias") return "↪";
  return "·";
}

type DropTarget = ContentTreeEntry | "root";

export function ContentLayout() {
  const { entries, error, isReloading, reload } = useContentTree();
  const { contentId } = useParams();
  const navigate = useNavigate();
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<"page" | "folder" | null>(null);
  const [moveEntry, setMoveEntry] = useState<ContentTreeEntry | null>(null);
  const [treeError, setTreeError] = useState("");
  const [dragEntry, setDragEntry] = useState<ContentTreeEntry | null>(null);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);

  const { byParent, entryById } = useMemo(() => {
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
    return { byParent, entryById };
  }, [entries]);

  async function onTrash(entry: ContentTreeEntry) {
    if (!window.confirm(`「${displayTitle(entry)}」を削除（ゴミ箱へ移動）しますか？`)) return;
    setTreeError("");
    try {
      await trashContent(entry.snapshot);
      await reload();
      if (contentId === entry.snapshot.item.id) navigate("/content");
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
      await reorderContentInTree(dragEntry.snapshot, targetParentId, last);
      await reload();
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
        await reorderContentInTree(dragEntry.snapshot, target.snapshot.node.id, last);
      } else {
        await reorderContentInTree(
          dragEntry.snapshot,
          target.snapshot.node.parentId,
          target.snapshot.item.id,
        );
      }
      await reload();
    } catch (e) {
      setTreeError(e instanceof Error ? e.message : String(e));
    } finally {
      setDragEntry(null);
      setDropHighlight(null);
    }
  }

  function onDragOverTarget(id: string, e: React.DragEvent) {
    e.preventDefault();
    setDropHighlight(id);
  }

  function renderNodes(parentId: string | "root", depth: number) {
    const children = byParent.get(parentId) ?? [];
    return children.map((entry) => {
      const id = entry.snapshot.item.id;
      const active = contentId === id;
      const canEdit = entry.snapshot.item.contentTypeKey === "page" || entry.snapshot.item.contentTypeKey === "article";
      const aliasTarget = entry.aliasTargetContentItemId;
      const targetEntry = aliasTarget ? entryById.get(aliasTarget) : null;
      const aliasWarn = entry.snapshot.item.contentTypeKey === "alias" && targetEntry && !targetEntry.snapshot.publishedRevision;
      const isFolder = entry.snapshot.item.contentTypeKey === "folder";
      const isBlog = entry.snapshot.item.contentTypeKey === "blog";
      const droppable = isFolder || isBlog;
      const highlight = dropHighlight === id;
      return (
        <li key={id} className="tree-item" style={{ paddingLeft: depth * 12 }}>
          <div
            className={`tree-row ${active ? "active" : ""} ${highlight ? "tree-drop-target" : ""}`}
            draggable
            onDragStart={() => setDragEntry(entry)}
            onDragEnd={() => { setDragEntry(null); setDropHighlight(null); }}
            onDragOver={(e) => { e.preventDefault(); setDropHighlight(id); }}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (droppable) void performDrop(entry);
              else void handleRowDrop(entry);
            }}
          >
            <button
              type="button"
              className={`tree-link ${active ? "active" : ""}`}
              onClick={() => canEdit && navigate(`/content/${id}`)}
              disabled={!canEdit}
            >
              <span className="tree-icon" aria-hidden>{typeIcon(entry.snapshot.item.contentTypeKey)}</span>
              <span className="tree-link-title">{displayTitle(entry)}</span>
              <span className="tree-meta">
                {TYPE_LABEL[entry.snapshot.item.contentTypeKey] ?? entry.snapshot.item.contentTypeKey}
                <span className="tree-dates" title="更新日時">
                  {formatDateTime(entry.snapshot.item.updatedAt)}
                </span>
              </span>
            </button>
            <TreeRowMenu
              entry={entry}
              onAddPage={() => { setCreateParentId(entry.snapshot.node.id); setCreateKind("page"); }}
              onAddFolder={() => { setCreateParentId(entry.snapshot.node.id); setCreateKind("folder"); }}
              onMove={() => setMoveEntry(entry)}
              onCopy={() => void onCopy(entry)}
              onTrash={() => void onTrash(entry)}
            />
          </div>
          {aliasWarn ? <p className="tree-warn">参照先が未公開です</p> : null}
          {byParent.has(entry.snapshot.node.id) ? (
            <ul className="tree-list" style={{ paddingLeft: 0 }}>{renderNodes(entry.snapshot.node.id, depth + 1)}</ul>
          ) : null}
        </li>
      );
    });
  }

  return (
    <div className="page content-layout">
      <div className="page-header">
        <div>
          <h1>コンテンツ</h1>
          <p>ドラッグで並べ替え・フォルダ／ブログへ移動（フォルダへドロップ＝末尾、項目へドロップ＝直後）。⋯ メニューまたは編集画面から削除（ゴミ箱へ）。</p>
        </div>
        <div className="toolbar">
          <PublicSiteLink className="btn">公開サイト（ホーム）</PublicSiteLink>
          <Button onClick={() => { setCreateParentId(null); setCreateKind("page"); }}>ページ</Button>
          <Button onClick={() => { setCreateParentId(null); setCreateKind("folder"); }}>フォルダ</Button>
          <ContentPageToolbar onRefresh={() => void reload()} />
        </div>
      </div>
      <div className="split content-split">
        <div className="panel tree-panel">
          <div
            className={`panel-head ${dropHighlight === "root" ? "tree-drop-target" : ""}`}
            onDragOver={(e) => onDragOverTarget("root", e)}
            onDragLeave={() => setDropHighlight(null)}
            onDrop={(e) => { e.preventDefault(); void performDrop("root"); }}
          >
            サイトツリー（ルートへドロップ可）
            {isReloading ? <span className="tree-reload-indicator">更新中…</span> : null}
          </div>
          <ul className="tree-list">{renderNodes("root", 0)}</ul>
        </div>
        <div className="panel editor-panel">
          <Outlet />
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
  );
}

export function ContentIndexPlaceholder() {
  return (
    <div className="editor-empty">
      <p>左のツリーからページまたは記事を選択してください。</p>
      <p>
        <PublicSiteLink className="btn btn-primary">公開サイトのホームを見る</PublicSiteLink>
      </p>
    </div>
  );
}
