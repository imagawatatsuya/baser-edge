import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ensureStepUp } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { StatusMessage } from "../components/ui/StatusMessage";
import { invalidateConsoleQuery, loadConsoleQuery } from "../lib/consoleQueryCache";

type PluginRow = { id: string; key: string; name: string; trust: string };
type ReleaseRow = { id: string; version: string; manifest: { capabilities?: string[] } };
type ActivationRow = { activation: { id: string }; release: { id: string; version: string }; plugin: { key: string } };

export function PluginsPage() {
  const { session } = useAuth();
  const [plugins, setPlugins] = useState<PluginRow[]>([]);
  const [pluginId, setPluginId] = useState("");
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [activations, setActivations] = useState<ActivationRow[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!session) return;
    void loadActivations();
  }, [session]);

  async function loadActivations() {
    if (!session) return;
    const path = `/v1/workspaces/${session.workspaceId}/plugin-activations?siteId=${session.siteId}`;
    const list = await loadConsoleQuery(
      path,
      () => apiFetch<ActivationRow[]>(path),
    );
    setActivations(list);
  }

  useEffect(() => {
    if (!session) return;
    const path = `/v1/workspaces/${session.workspaceId}/plugins`;
    void loadConsoleQuery(path, () => apiFetch<PluginRow[]>(path), { maxAgeMs: 5 * 60_000 })
      .then((list) => { setPlugins(list); if (list[0]) setPluginId(list[0].id); })
      .catch((e) => setStatus(e instanceof Error ? e.message : String(e)));
  }, [session]);

  useEffect(() => {
    if (!session || !pluginId) return;
    const path = `/v1/plugins/${pluginId}/releases`;
    void loadConsoleQuery(path, () => apiFetch<ReleaseRow[]>(path), { maxAgeMs: 5 * 60_000 })
      .then(setReleases)
      .catch(() => setReleases([]));
  }, [session, pluginId]);

  async function activate(release: ReleaseRow) {
    if (!session) return;
    setStatus("プラグインを有効化中…");
    try {
      await ensureStepUp("plugin.activate", session.credentialId);
      const caps = capabilities.length ? capabilities : (release.manifest.capabilities ?? []).slice(0, 3);
      await apiFetch(`/v1/workspaces/${session.workspaceId}/plugin-activations`, {
        method: "POST",
        json: {
          siteId: session.siteId,
          pluginReleaseId: release.id,
          grantedCapabilities: caps,
          allowedHosts: [],
        },
      });
      invalidateConsoleQuery(`/v1/workspaces/${session.workspaceId}/plugin-activations`);
      await loadActivations();
      setStatus("有効化しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function deactivate(activationId: string) {
    if (!session) return;
    if (!window.confirm("このプラグインの有効化を解除しますか？")) return;
    setStatus("無効化中…");
    try {
      await apiFetch(`/v1/plugin-activations/${encodeURIComponent(activationId)}`, { method: "DELETE" });
      invalidateConsoleQuery(`/v1/workspaces/${session.workspaceId}/plugin-activations`);
      await loadActivations();
      setStatus("無効化しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>プラグイン</h1>
          <p>リリースの有効化（step-up 必須）。Manifest の capability を明示的に付与します。</p>
        </div>
      </div>
      {plugins.length ? (
        <Field label="プラグイン">
          <select value={pluginId} onChange={(e) => setPluginId(e.target.value)}>
            {plugins.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.trust})</option>)}
          </select>
        </Field>
      ) : (
        <p className="status">プラグインがありません（API / 診断で登録）。</p>
      )}
      <Field label="付与する capability（カンマ区切り）" hint="空なら Manifest 先頭を使用">
        <input
          value={capabilities.join(",")}
          onChange={(e) => setCapabilities(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="content:read"
        />
      </Field>
      <ul className="simple-list">
        {releases.map((r) => (
          <li key={r.id}>
            <span>v{r.version}</span>
            <Button onClick={() => void activate(r)}>サイトで有効化</Button>
          </li>
        ))}
      </ul>
      <h2>有効なアクティベーション</h2>
      <ul className="simple-list">
        {activations.map((a) => (
          <li key={a.activation.id}>
            {a.plugin.key} — v{a.release.version}
            <Button variant="danger" onClick={() => void deactivate(a.activation.id)}>無効化</Button>
          </li>
        ))}
      </ul>
      <p><Link to="/themes">テーマ設定へ</Link></p>
      <StatusMessage message={status} />
    </div>
  );
}
