import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ContentTreeEntry } from "../../api/types";

export function TreeRowMenu({
  entry,
  onAddPage,
  onAddFolder,
  onMove,
  onCopy,
  onTrash,
}: {
  entry: ContentTreeEntry;
  onAddPage: () => void;
  onAddFolder: () => void;
  onMove: () => void;
  onCopy: () => void;
  onTrash: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 160;
    const left = Math.min(Math.max(8, rect.right - panelWidth), window.innerWidth - panelWidth - 8);
    let top = rect.bottom + 4;
    const estimatedHeight = 200;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    }
    setCoords({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="tree-menu-trigger"
        aria-label="操作"
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
                style={{ top: coords.top, left: coords.left }}
              >
                {isFolder ? (
                  <>
                    <button type="button" role="menuitem" onClick={() => { onAddPage(); close(); }}>ページを追加</button>
                    <button type="button" role="menuitem" onClick={() => { onAddFolder(); close(); }}>フォルダを追加</button>
                  </>
                ) : null}
                <button type="button" role="menuitem" onClick={() => { onMove(); close(); }}>移動…</button>
                <button type="button" role="menuitem" onClick={() => { onCopy(); close(); }}>コピー…</button>
                <button type="button" role="menuitem" className="tree-menu-danger" onClick={() => { onTrash(); close(); }}>削除（ゴミ箱へ）</button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
