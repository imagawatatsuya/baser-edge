import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ensureStepUp, unpublishCustomEntry } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { StatusMessage } from "../components/ui/StatusMessage";

type EntrySnapshot = {
  entry: { id: string; lockVersion: number; slug: string | null };
  workingRevision: { id: string; values: Record<string, unknown> };
  publishedRevision: { id: string } | null;
};

type SchemaField = { definition: { key: string; name: string; type: string }; required: boolean };

export function CustomContentEntriesPage() {
  const { definitionId = "" } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<EntrySnapshot[]>([]);
  const [status, setStatus] = useState("");

  const reload = useCallback(async () => {
    if (!definitionId) return;
    const list = await apiFetch<EntrySnapshot[]>(`/v1/custom-contents/${encodeURIComponent(definitionId)}/entries`);
    setEntries(list);
  }, [definitionId]);

  useEffect(() => { void reload().catch((e) => setStatus(String(e))); }, [reload]);

  async function createEntry() {
    if (!session) return;
    const slug = window.prompt("エントリ slug（ASCII）", "item-1");
    if (!slug) return;
    try {
      const created = await apiFetch<{ entry: { id: string } }>(`/v1/custom-contents/${encodeURIComponent(definitionId)}/entries`, {
        method: "POST",
        json: { slug, values: {} },
      });
      navigate(`/custom/${definitionId}/entries/${created.entry.id}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>エントリ一覧</h1>
          <p><Link to="/custom">← カスタムコンテンツ</Link></p>
        </div>
        <Button variant="primary" onClick={() => void createEntry()}>エントリを追加</Button>
      </div>
      <ul className="simple-list">
        {entries.map((row) => (
          <li key={row.entry.id}>
            <Link to={`/custom/${definitionId}/entries/${row.entry.id}`}>{row.entry.slug ?? row.entry.id}</Link>
            {row.publishedRevision ? <span className="badge badge-published">公開</span> : <span className="badge badge-draft">下書き</span>}
          </li>
        ))}
      </ul>
      <StatusMessage message={status} />
    </div>
  );
}

export function CustomEntryEditPage() {
  const { definitionId = "", entryId = "" } = useParams();
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<EntrySnapshot | null>(null);
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entryId || !definitionId) return;
    void (async () => {
      const snap = await apiFetch<EntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      setSnapshot(snap);
      const list = await apiFetch<{ definition: { id: string }; schema: { fields: SchemaField[] } }[]>(`/v1/sites/${session!.siteId}/custom-contents`);
      const def = list.find((d) => d.definition.id === definitionId);
      setSchema(def?.schema.fields ?? []);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(snap.workingRevision.values)) {
        initial[k] = typeof v === "string" ? v : String(v ?? "");
      }
      setValues(initial);
    })().catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [entryId, definitionId, session]);

  async function onSave() {
    if (!snapshot) return;
    setBusy(true);
    setStatus("保存中…");
    try {
      await apiFetch(`/v1/custom-entries/${encodeURIComponent(entryId)}/revisions`, {
        method: "POST",
        json: {
          baseRevisionId: snapshot.workingRevision.id,
          expectedLockVersion: snapshot.entry.lockVersion,
          values,
          changeSummary: "管理画面から編集",
        },
      });
      const fresh = await apiFetch<EntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      setSnapshot(fresh);
      setStatus("保存しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!session || !snapshot) return;
    setBusy(true);
    setStatus("公開処理中…");
    try {
      await apiFetch(`/v1/custom-entries/${encodeURIComponent(entryId)}/revisions`, {
        method: "POST",
        json: {
          baseRevisionId: snapshot.workingRevision.id,
          expectedLockVersion: snapshot.entry.lockVersion,
          values,
          changeSummary: "公開前の保存",
        },
      });
      const fresh = await apiFetch<EntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      const approval = await apiFetch<{ id: string }>(`/v1/custom-entries/${encodeURIComponent(entryId)}/approvals`, {
        method: "POST",
        json: { revisionId: fresh.workingRevision.id },
      });
      await apiFetch(`/v1/custom-entry-approvals/${encodeURIComponent(approval.id)}/decide`, {
        method: "POST",
        json: { decision: "approved", comment: "管理画面" },
      });
      await ensureStepUp("custom-entry.publish", session.credentialId);
      await apiFetch(`/v1/custom-entries/${encodeURIComponent(entryId)}/publish`, {
        method: "POST",
        json: { revisionId: fresh.workingRevision.id, approvalId: approval.id },
      });
      setSnapshot(await apiFetch<EntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`));
      setStatus("公開しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUnpublish() {
    if (!session || !snapshot?.publishedRevision) return;
    if (!window.confirm("公開を取り下げますか？サイト上では非公開になります（作業中のリビジョンは残ります）。")) return;
    setBusy(true);
    setStatus("公開を取り下げています…");
    try {
      await unpublishCustomEntry(entryId, session.credentialId);
      setSnapshot(await apiFetch<EntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`));
      setStatus("公開を取り下げました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) return <p className="status">読み込み中…</p>;

  return (
    <div className="page editor-form">
      <p><Link to={`/custom/${definitionId}/entries`}>← 一覧</Link></p>
      <h1>{snapshot.entry.slug ?? entryId}</h1>
      {schema.map((field) => (
        <Field key={field.definition.key} label={field.definition.name}>
          <input
            value={values[field.definition.key] ?? ""}
            required={field.required}
            onChange={(e) => setValues({ ...values, [field.definition.key]: e.target.value })}
          />
        </Field>
      ))}
      <div className="toolbar">
        <Button disabled={busy} onClick={() => void onSave()}>保存</Button>
        <Button variant="primary" disabled={busy} onClick={() => void onPublish()}>公開</Button>
        {snapshot.publishedRevision ? (
          <Button disabled={busy} onClick={() => void onUnpublish()}>公開を取り下げ</Button>
        ) : null}
      </div>
      <StatusMessage message={status} />
    </div>
  );
}
