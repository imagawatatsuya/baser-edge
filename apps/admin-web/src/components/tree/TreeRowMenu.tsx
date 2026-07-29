import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ContentTreeEntry } from "../../api/types";
import { displayTitle } from "../../lib/document";

export function TreeRowMenu({
  entry,
  onAddPage,
  onAddFolder,
  onMoveUp,
  onMoveDown,
  onMoveToParent,
  canMoveUp,
  canMoveDown,
  canMoveToParent,
  onMove,
  onCopy,
  onTrash,
}: {
  entry: ContentTreeEntry;
  onAddPage: () => void;
  onAddFolder: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToParent: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveToParent: boolean;
  onMove: () => void;
  onCopy: () => void;
  onTrash: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function runAction(action: () => void) {
    action();
    close();
  }

  function toggle() {
    if (open) {
      close(true);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 160;
    const left = Math.min(Math.max(8, rect.right - panelWidth), window.innerWidth - panelWidth - 8);
    let top = rect.bottom + 4;
    const estimatedHeight = 320;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    }
    setCoords({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
        ?.focus();
    });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const isFolder = entry.snapshot.item.contentTypeKey === "folder";
  const title = displayTitle(entry);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (!items.length) return;
    e.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Home") items[0].focus();
    else if (e.key === "End") items.at(-1)?.focus();
    else if (e.key === "ArrowDown") items[(currentIndex + 1 + items.length) % items.length].focus();
    else items[(currentIndex - 1 + items.length) % items.length].focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="tree-menu-trigger"
        aria-label={`${title}の操作`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        ⋯
      </button>
      {open
        ? createPortal(
            <>
              <div className="tree-menu-backdrop" aria-hidden />
              <div
                ref={panelRef}
                className="tree-menu-panel tree-menu-panel--fixed"
                role="menu"
                aria-label={`${title}の操作`}
                style={{ top: coords.top, left: coords.left }}
                onKeyDown={onMenuKeyDown}
              >
                {isFolder ? (
                  <>
                    <button type="button" role="menuitem" onClick={() => runAction(onAddPage)}>ページを追加</button>
                    <button type="button" role="menuitem" onClick={() => runAction(onAddFolder)}>フォルダを追加</button>
                  </>
                ) : null}
                <button type="button" role="menuitem" disabled={!canMoveUp} onClick={() => runAction(onMoveUp)}>一つ上へ移動</button>
                <button type="button" role="menuitem" disabled={!canMoveDown} onClick={() => runAction(onMoveDown)}>一つ下へ移動</button>
                <button type="button" role="menuitem" disabled={!canMoveToParent} onClick={() => runAction(onMoveToParent)}>親階層へ移動</button>
                <button type="button" role="menuitem" onClick={() => runAction(onMove)}>移動先を選ぶ…</button>
                <button type="button" role="menuitem" onClick={() => runAction(onCopy)}>コピー…</button>
                <button type="button" role="menuitem" className="tree-menu-danger" onClick={() => runAction(onTrash)}>削除（ゴミ箱へ）</button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
