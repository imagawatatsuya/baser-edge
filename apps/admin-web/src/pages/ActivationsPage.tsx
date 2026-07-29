import { useCallback, useEffect, useState } from "react";
import { apiFetch, ensureStepUp } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { loadConsoleQuery, setConsoleQuery } from "../lib/consoleQueryCache";

type ThemeRow = { id: string; key: string; name: string };
type ThemeRelease = { id: string; version: string };
type ActiveTheme = { theme: ThemeRow; release: ThemeRelease };

type ActiveThemeSummary = { themeName: string; version: string };

export function ActivationsPage() {
  const { session } = useAuth();
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [releases, setReleases] = useState<ThemeRelease[]>([]);
  const [themeId, setThemeId] = useState("");
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<ActiveThemeSummary | null>(null);
  const [status, setStatus] = useState("");

  const applyActiveTheme = useCallback((active: ActiveTheme | null) => {
    if (!active) {
      setActiveReleaseId(null);
      setActiveSummary(null);
      return;
    }
    setActiveReleaseId(active.release.id);
    setActiveSummary({ themeName: active.theme.name, version: active.release.version });
  }, []);

  const loadActiveTheme = useCallback(async () => {
    if (!session) return;
    const path = `/v1/sites/${session.siteId}/theme`;
    try {
      const active = await loadConsoleQuery(path, () => apiFetch<ActiveTheme>(path));
      applyActiveTheme(active);
      setThemeId((current) => current || active.theme.id);
    } catch {
      applyActiveTheme(null);
    }
  }, [session, applyActiveTheme]);

  useEffect(() => {
    if (!session) return;
    void loadActiveTheme();
  }, [session, loadActiveTheme]);

  useEffect(() => {
    if (!session) return;
    const path = `/v1/workspaces/${session.workspaceId}/themes`;
    void loadConsoleQuery(path, () => apiFetch<ThemeRow[]>(path), { maxAgeMs: 5 * 60_000 })
      .then((list) => {
        setThemes(list);
        setThemeId((current) => current || list[0]?.id || "");
      })
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [session]);

  useEffect(() => {
    if (!themeId) return;
    const path = `/v1/themes/${themeId}/releases`;
    void loadConsoleQuery(path, () => apiFetch<ThemeRelease[]>(path), { maxAgeMs: 5 * 60_000 })
      .then(setReleases)
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [themeId]);

  async function activate(releaseId: string) {
    if (!session) return;
    setStatus("テーマを有効化中…");
    try {
      await ensureStepUp("theme.activate", session.credentialId);
      const activated = await apiFetch<ActiveTheme>(`/v1/sites/${session.siteId}/theme-activations`, {
        method: "POST",
        json: { themeReleaseId: releaseId },
      });
      applyActiveTheme(activated);
      setConsoleQuery(`/v1/sites/${session.siteId}/theme`, activated);
      setThemeId(activated.theme.id);
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
      {activeSummary ? (
        <p className="status">
          サイトで有効: {activeSummary.themeName} v{activeSummary.version}
        </p>
      ) : (
        <p className="status">サイトで有効なテーマはまだありません。</p>
      )}
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
            {r.id === activeReleaseId ? <span className="badge badge-published">有効</span> : null}
            <Button onClick={() => void activate(r.id)} disabled={r.id === activeReleaseId}>有効化</Button>
          </li>
        ))}
      </ul>
      <StatusMessage message={status} />
    </div>
  );
}
