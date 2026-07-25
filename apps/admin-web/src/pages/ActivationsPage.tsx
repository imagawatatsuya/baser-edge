import { useEffect, useState } from "react";
import { apiFetch, ensureStepUp } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";

type ThemeRow = { id: string; key: string; name: string };
type ThemeRelease = { id: string; version: string };

export function ActivationsPage() {
  const { session } = useAuth();
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [releases, setReleases] = useState<ThemeRelease[]>([]);
  const [themeId, setThemeId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!session) return;
    void apiFetch<ThemeRow[]>(`/v1/workspaces/${session.workspaceId}/themes`)
      .then((list) => { setThemes(list); if (list[0]) setThemeId(list[0].id); })
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [session]);

  useEffect(() => {
    if (!themeId) return;
    void apiFetch<ThemeRelease[]>(`/v1/themes/${themeId}/releases`)
      .then(setReleases)
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [themeId]);

  async function activate(releaseId: string) {
    if (!session) return;
    setStatus("テーマを有効化中…");
    try {
      await ensureStepUp("theme.activate", session.credentialId);
      await apiFetch(`/v1/sites/${session.siteId}/theme-activations`, {
        method: "POST",
        json: { themeReleaseId: releaseId },
      });
      setStatus("テーマを有効化しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>テーマ</h1>
          <p>Theme Release の有効化（step-up 必須）。</p>
        </div>
      </div>
      {themes.length ? (
        <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      ) : (
        <p className="status">テーマがありません。</p>
      )}
      <ul className="simple-list">
        {releases.map((r) => (
          <li key={r.id}>
            <span>v{r.version}</span>
            <Button onClick={() => void activate(r.id)}>有効化</Button>
          </li>
        ))}
      </ul>
      <StatusMessage message={status} />
    </div>
  );
}
