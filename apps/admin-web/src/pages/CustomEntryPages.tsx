import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ensureStepUp, unpublishCustomEntry } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type { CustomEntrySnapshot } from "../hooks/useCustomEntries";
import { useCustomEntriesContext } from "../hooks/useCustomEntries";
import { DraftOnlySaveModal } from "../components/DraftOnlySaveModal";
import { EditorLeaveDialog } from "../components/EditorLeaveDialog";
import { RevisionBadges } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useEditorLeaveGuard } from "../hooks/useEditorLeaveGuard";
import { computeCustomEntrySyncState, customEntryValuesDirty, editorLeaveDialogMode } from "../lib/contentEditorSync";

type SchemaField = { definition: { key: string; name: string; type: string }; required: boolean };

export function CustomContentEntriesPage() {
  const { definitionId = "" } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { entries, error, reload } = useCustomEntriesContext();
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (error) setStatus(error);
  }, [error]);

  async function createEntry() {
    if (!session) return;
    const slug = window.prompt("エントリ slug（ASCII）", "item-1");
    if (!slug) return;
    try {
      const created = await apiFetch<{ entry: { id: string } }>(`/v1/custom-contents/${encodeURIComponent(definitionId)}/entries`, {
        method: "POST",
        json: { slug, values: {} },
      });
      await reload();
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
        {entries.map((row) => {
          const outOfSync = row.publishedRevision && row.workingRevision.id !== row.publishedRevision.id;
          return (
            <li key={row.entry.id}>
              <Link to={`/custom/${definitionId}/entries/${row.entry.id}`}>{row.entry.slug ?? row.entry.id}</Link>
              {row.publishedRevision ? <span className="badge badge-published">公開</span> : <span className="badge badge-draft">下書き</span>}
              {outOfSync ? <span className="badge badge-warn">本番未反映</span> : null}
            </li>
          );
        })}
      </ul>
      <StatusMessage message={status} />
    </div>
  );
}

function valuesFromSnapshot(snap: CustomEntrySnapshot): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const [k, v] of Object.entries(snap.workingRevision.values)) {
    initial[k] = typeof v === "string" ? v : String(v ?? "");
  }
  return initial;
}

export function CustomEntryEditPage() {
  const { definitionId = "", entryId = "" } = useParams();
  const { session } = useAuth();
  const { reload: reloadEntries } = useCustomEntriesContext();
  const [snapshot, setSnapshot] = useState<CustomEntrySnapshot | null>(null);
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftOnlyModalOpen, setDraftOnlyModalOpen] = useState(false);

  const syncState = snapshot ? computeCustomEntrySyncState(snapshot, values) : null;
  const { blocker, proceedLeave, cancelBlockedNavigation } = useEditorLeaveGuard(Boolean(syncState?.shouldBlockNavigation));
  const leaveDialogOpen = blocker.state === "blocked";
  const leaveDialogMode = syncState ? editorLeaveDialogMode(syncState) : "unsaved" as const;

  useEffect(() => {
    if (!entryId || !definitionId || !session) return;
    void (async () => {
      const snap = await apiFetch<CustomEntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      setSnapshot(snap);
      const list = await apiFetch<{ definition: { id: string }; schema: { fields: SchemaField[] } }[]>(`/v1/sites/${session.siteId}/custom-contents`);
      const def = list.find((d) => d.definition.id === definitionId);
      setSchema(def?.schema.fields ?? []);
      setValues(valuesFromSnapshot(snap));
    })().catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [entryId, definitionId, session]);

  async function commitRevision(changeSummary: string): Promise<CustomEntrySnapshot> {
    if (!snapshot) throw new Error("not loaded");
    await apiFetch(`/v1/custom-entries/${encodeURIComponent(entryId)}/revisions`, {
      method: "POST",
      json: {
        baseRevisionId: snapshot.workingRevision.id,
        expectedLockVersion: snapshot.entry.lockVersion,
        values,
        changeSummary,
      },
    });
    const fresh = await apiFetch<CustomEntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
    setSnapshot(fresh);
    setValues(valuesFromSnapshot(fresh));
    return fresh;
  }

  async function publishLiveWorkflow(): Promise<boolean> {
    if (!session || !snapshot) return false;
    setBusy(true);
    setStatus("サイトに反映しています…");
    try {
      let fresh = snapshot;
      if (customEntryValuesDirty(snapshot.workingRevision.values, values)) {
        fresh = await commitRevision("管理画面から編集（公開反映前）");
      }
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
      const published = await apiFetch<CustomEntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      flushSync(() => {
        setSnapshot(published);
        setValues(valuesFromSnapshot(published));
      });
      await reloadEntries();
      setStatus("サイトに反映しました。");
      return true;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraftOnly() {
    if (!snapshot) return;
    setBusy(true);
    setStatus("下書きを保存中…");
    try {
      if (syncState?.isDirty) await commitRevision("管理画面から編集（下書きのみ）");
      await reloadEntries();
      setStatus("下書きのみ保存しました。公開サイトはまだ古い版です。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!snapshot) return;
    if (syncState?.published) {
      setDraftOnlyModalOpen(true);
      return;
    }
    setBusy(true);
    setStatus("保存中…");
    try {
      await commitRevision("管理画面から編集");
      await reloadEntries();
      setStatus("保存しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function discardUnsavedInput() {
    if (!snapshot) return;
    setValues(valuesFromSnapshot(snapshot));
  }

  async function onUnpublish() {
    if (!session || !snapshot?.publishedRevision) return;
    if (!window.confirm("公開を取り下げますか？サイト上では非公開になります（作業中のリビジョンは残ります）。")) return;
    setBusy(true);
    setStatus("公開を取り下げています…");
    try {
      await unpublishCustomEntry(entryId, session.credentialId);
      const fresh = await apiFetch<CustomEntrySnapshot>(`/v1/custom-entries/${encodeURIComponent(entryId)}`);
      setSnapshot(fresh);
      setValues(valuesFromSnapshot(fresh));
      await reloadEntries();
      setStatus("公開を取り下げました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) return <p className="status">読み込み中…</p>;

  const published = syncState?.published ?? false;
  const hasUnpublishedChanges = syncState?.hasUnpublishedChanges ?? false;
  const isDirty = syncState?.isDirty ?? false;
  const liveSiteOutOfSync = syncState?.liveSiteOutOfSync ?? false;
  const needsPublish = !published || hasUnpublishedChanges || isDirty;
  const publishLabel = published ? "サイトに反映" : "公開";

  return (
    <div className="page editor-form">
      {liveSiteOutOfSync ? (
        <div className="editor-live-stale-banner" role="alert">
          <strong>公開サイトはまだ古い版です。</strong>
          訪問者に見える内容を変えるには「{publishLabel}」が必要です。
        </div>
      ) : null}
      <p><Link to={`/custom/${definitionId}/entries`}>← 一覧</Link></p>
      <h1>{snapshot.entry.slug ?? entryId}</h1>
      <RevisionBadges published={published} hasUnpublishedChanges={hasUnpublishedChanges} isDirty={isDirty} />
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
        {!published ? (
          <Button disabled={busy} onClick={() => void onSave()}>保存</Button>
        ) : (
          <Button disabled={busy || !isDirty} onClick={() => setDraftOnlyModalOpen(true)}>下書きのみ保存…</Button>
        )}
        {needsPublish ? (
          <Button variant="primary" disabled={busy} onClick={() => void publishLiveWorkflow()}>{publishLabel}</Button>
        ) : null}
        {snapshot.publishedRevision ? (
          <Button disabled={busy} onClick={() => void onUnpublish()}>公開を取り下げ</Button>
        ) : null}
      </div>
      <StatusMessage message={status} />
      <DraftOnlySaveModal
        open={draftOnlyModalOpen}
        busy={busy}
        onCancel={() => setDraftOnlyModalOpen(false)}
        onConfirm={() => {
          setDraftOnlyModalOpen(false);
          void onSaveDraftOnly();
        }}
      />
      <EditorLeaveDialog
        open={leaveDialogOpen}
        mode={leaveDialogMode}
        busy={busy}
        published={published}
        needsCommit={isDirty}
        onCancel={() => cancelBlockedNavigation()}
        onSaveAndPublishLive={() => {
          void (async () => {
            const ok = await publishLiveWorkflow();
            if (ok) proceedLeave();
          })();
        }}
        onPublishLive={() => {
          void (async () => {
            const ok = await publishLiveWorkflow();
            if (ok) proceedLeave();
          })();
        }}
        onSaveDraftOnly={() => {
          void (async () => {
            await onSaveDraftOnly();
            proceedLeave({ force: true });
          })();
        }}
        onDiscard={() => {
          flushSync(() => discardUnsavedInput());
          proceedLeave();
        }}
        onLeaveWithStaleLive={() => {
          proceedLeave({ force: true });
        }}
      />
    </div>
  );
}
