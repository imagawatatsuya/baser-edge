import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { displayTitle } from "../lib/document";
import { StatusMessage } from "../components/ui/StatusMessage";

type CustomListEntry = {
  definition: { id: string; tableId: string };
  snapshot: ContentSnapshotLite;
  schema: { fields: { key: string; name: string }[] };
};

type ContentSnapshotLite = {
  route: { path: string };
  workingRevision?: { fields?: Record<string, unknown> };
  node: { slug: string };
};

export function CustomContentPage() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<CustomListEntry[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!session) return;
    void apiFetch<CustomListEntry[]>(`/v1/sites/${session.siteId}/custom-contents`)
      .then(setEntries)
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [session]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>カスタムコンテンツ</h1>
          <p>定義ごとにエントリを編集・公開します。</p>
        </div>
      </div>
      <ul className="simple-list">
        {entries.map((entry) => (
          <li key={entry.definition.id}>
            <Link to={`/custom/${entry.definition.id}/entries`}>
              <strong>{displayTitle({ snapshot: entry.snapshot as never })}</strong>
            </Link>
            <span>{entry.snapshot.route.path}</span>
            <span className="tree-meta">{entry.schema.fields.length} フィールド</span>
          </li>
        ))}
      </ul>
      {!entries.length ? <p className="status">カスタムコンテンツがありません。</p> : null}
      <StatusMessage message={status} />
    </div>
  );
}
