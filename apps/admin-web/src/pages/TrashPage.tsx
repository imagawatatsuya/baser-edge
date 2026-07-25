import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { ContentTreeEntry } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { displayTitle } from "../lib/document";
import { restoreContent } from "../components/tree/TreeModals";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";

export function TrashPage() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<ContentTreeEntry[]>([]);
  const [status, setStatus] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    const list = await apiFetch<ContentTreeEntry[]>(`/v1/sites/${session.siteId}/trash`);
    setEntries(list);
  }, [session]);

  useEffect(() => { void reload().catch((e) => setStatus(String(e))); }, [reload]);

  async function onRestore(entry: ContentTreeEntry) {
    setStatus("復元中…");
    try {
      await restoreContent(entry.snapshot);
      await reload();
      setStatus("復元しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>ゴミ箱</h1>
          <p>サイトツリーから外したコンテンツです。復元すると元の場所に戻せます（完全削除は別操作）。</p>
        </div>
        <Link to="/content" className="btn">コンテンツへ</Link>
      </div>
      <ul className="simple-list">
        {entries.map((entry) => (
          <li key={entry.snapshot.item.id}>
            <span>{displayTitle(entry)}</span>
            <span className="tree-meta">{entry.snapshot.route.path}</span>
            <Button onClick={() => void onRestore(entry)}>復元</Button>
          </li>
        ))}
      </ul>
      {!entries.length ? <p className="status">ゴミ箱は空です。</p> : null}
      <StatusMessage message={status} />
    </div>
  );
}
