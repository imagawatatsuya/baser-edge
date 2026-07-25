import { useEffect, useState } from "react";
import { apiFetch, ensureStepUp } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";

type MailFormRow = { definition: { id: string }; snapshot: { route: { path: string }; workingRevision?: { fields?: { title?: string } } } };

export function MailPage() {
  const { session } = useAuth();
  const [forms, setForms] = useState<MailFormRow[]>([]);
  const [selected, setSelected] = useState("");
  const [submissions, setSubmissions] = useState<{ id: string; submittedAt: number }[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!session) return;
    void apiFetch<MailFormRow[]>(`/v1/sites/${session.siteId}/mail-forms`)
      .then((list) => { setForms(list); if (list[0]) setSelected(list[0].definition.id); })
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [session]);

  useEffect(() => {
    if (!selected) return;
    void apiFetch<{ id: string; submittedAt: number }[]>(`/v1/mail-forms/${selected}/submissions`)
      .then(setSubmissions)
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [selected]);

  async function loadSensitive(id: string) {
    if (!session) return;
    try {
      await ensureStepUp("mail-submission.read-sensitive", session.credentialId);
      const row = await apiFetch<Record<string, unknown>>(`/v1/mail-submissions/${id}?includeSensitive=true`);
      setStatus(`取得: ${JSON.stringify(row).slice(0, 120)}…`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>メールフォーム</h1>
          <p>送信一覧（PII は step-up 後に表示）。</p>
        </div>
      </div>
      {forms.length ? (
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {forms.map((f) => (
            <option key={f.definition.id} value={f.definition.id}>{f.snapshot.workingRevision?.fields?.title ?? f.snapshot.route.path}</option>
          ))}
        </select>
      ) : null}
      <ul className="simple-list">
        {submissions.map((s) => (
          <li key={s.id}>
            <span>{new Date(s.submittedAt).toLocaleString()}</span>
            <code>{s.id}</code>
            <Button onClick={() => void loadSensitive(s.id)}>詳細（PII）</Button>
          </li>
        ))}
      </ul>
      <StatusMessage message={status} />
    </div>
  );
}
