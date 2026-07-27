import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { ContentTreeEntry } from "../api/types";
import type { CustomEntrySnapshot } from "../hooks/useCustomEntries";
import { StatusMessage } from "../components/ui/StatusMessage";
import {
  isContentTreeEntryLiveOutOfSync,
  isCustomEntryLiveOutOfSync,
} from "../lib/liveSiteOutOfSync";

type CustomDefinitionRow = {
  definition: { id: string };
  snapshot: { route: { path: string } };
};

export function LiveSiteOutOfSyncPage() {
  const { session } = useAuth();
  const [contentRows, setContentRows] = useState<ContentTreeEntry[]>([]);
  const [customRows, setCustomRows] = useState<{ definitionId: string; definitionPath: string; entry: CustomEntrySnapshot }[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setStatus("");
    try {
      const tree = await apiFetch<ContentTreeEntry[]>(`/v1/sites/${session.siteId}/content-tree`);
      setContentRows(tree.filter(isContentTreeEntryLiveOutOfSync));
      const defs = await apiFetch<CustomDefinitionRow[]>(`/v1/sites/${session.siteId}/custom-contents`);
      const customOut: typeof customRows = [];
      for (const def of defs) {
        const entries = await apiFetch<CustomEntrySnapshot[]>(
          `/v1/custom-contents/${encodeURIComponent(def.definition.id)}/entries`,
        );
        for (const entry of entries) {
          if (isCustomEntryLiveOutOfSync(entry)) {
            customOut.push({
              definitionId: def.definition.id,
              definitionPath: def.snapshot.route.path,
              entry,
            });
          }
        }
      }
      setCustomRows(customOut);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const total = contentRows.length + customRows.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>本番未反映</h1>
          <p>
            下書きは保存済みですが、<strong>訪問者向けサイトはまだ古い版</strong>の一覧です。各項目を開き「サイトに反映」してください。
          </p>
        </div>
        <button type="button" className="btn" disabled={loading} onClick={() => void reload()}>
          再読み込み
        </button>
      </div>
      {loading ? <p className="status">読み込み中…</p> : null}
      {!loading && total === 0 ? (
        <p className="status">本番と下書きがずれているコンテンツはありません。</p>
      ) : null}
      {!loading && contentRows.length > 0 ? (
        <section className="panel panel-pad">
          <h2 className="panel-title">サイトツリー（{contentRows.length}）</h2>
          <ul className="simple-list">
            {contentRows.map((row) => (
              <li key={row.snapshot.item.id}>
                <Link to={`/content/${encodeURIComponent(row.snapshot.item.id)}`}>
                  {row.snapshot.route.path}
                </Link>
                <span className="badge badge-warn">本番未反映</span>
                <span className="tree-meta">{row.snapshot.item.contentTypeKey}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!loading && customRows.length > 0 ? (
        <section className="panel panel-pad">
          <h2 className="panel-title">カスタムエントリ（{customRows.length}）</h2>
          <ul className="simple-list">
            {customRows.map((row) => (
              <li key={row.entry.entry.id}>
                <Link to={`/custom/${encodeURIComponent(row.definitionId)}/entries/${encodeURIComponent(row.entry.entry.id)}`}>
                  {row.entry.entry.slug ?? row.entry.entry.id}
                </Link>
                <span className="badge badge-warn">本番未反映</span>
                <span className="tree-meta">{row.definitionPath}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <StatusMessage message={status} />
    </div>
  );
}
