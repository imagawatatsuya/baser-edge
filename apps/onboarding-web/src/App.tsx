import { useEffect, useState } from "react";

const LAST_SITE_KEY = "baser-edge-last-site";

type Help = {
  createTokenUrl: string;
  createCustomTokenUrl?: string;
  permissions: string[];
  trialNote?: string;
  safetyNote?: string;
  tokenGuide?: {
    summary: string;
    intro: string;
    steps: { title: string; body: string }[];
    permissionRows: { column1: string; column2: string; column3: string; labelJa: string }[];
    doNotUse: string;
    afterPaste: string;
  };
  oauthEnabled?: boolean;
  publicTrial?: boolean;
  ready?: boolean;
  oauth?: {
    title: string;
    steps: string[];
    fallbackSummary: string;
    notConfiguredNote: string;
    destroyTitle?: string;
    destroyButton?: string;
    publicUnavailable?: string;
  };
  provisionStackId?: string;
  teardownUrl?: string;
  steps: { id: string; label: string }[];
};

type Session = {
  id: string;
  status: string;
  step: string;
  message: string;
  consoleUrl?: string;
  stackId?: string;
  error?: string;
  accountName?: string;
};

type LastSite = { stackId: string };

function loadLastSite(): LastSite | null {
  try {
    const raw = localStorage.getItem(LAST_SITE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSite;
    return parsed.stackId ? parsed : null;
  } catch {
    return null;
  }
}

function saveLastSite(stackId: string) {
  localStorage.setItem(LAST_SITE_KEY, JSON.stringify({ stackId }));
}

function clearLastSite() {
  localStorage.removeItem(LAST_SITE_KEY);
}

export function App() {
  const [help, setHelp] = useState<Help | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [trialReady, setTrialReady] = useState(true);
  const [token, setToken] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stackId, setStackId] = useState("");
  const [destroyMsg, setDestroyMsg] = useState("");
  const [destroyError, setDestroyError] = useState("");
  const [destroying, setDestroying] = useState(false);
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [publicTrial, setPublicTrial] = useState(false);

  const showManualToken = !publicTrial;

  async function beginSession(payload: { cloudflareApiToken?: string; oauthGrantId?: string }) {
    const res = await fetch("/api/onboarding/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message ?? "開始できませんでした");
    if (body.stackId) {
      setStackId(body.stackId);
      saveLastSite(body.stackId);
    }
    setSession({
      id: body.sessionId,
      status: "running",
      step: "connect",
      message: "接続しました…",
      accountName: body.accountName,
      stackId: body.stackId,
    });
  }

  async function runDestroy(payload: { cloudflareApiToken?: string; oauthGrantId?: string }) {
    const sid = stackId.trim();
    if (!sid) {
      throw new Error(
        "スタック ID がありません（開設済みのサイトがこのブラウザに記録されていない場合は ob-… を入力）",
      );
    }
    if (
      !window.confirm(
        `お試しサイト「${sid}」の Worker とデータベースを、あなたの Cloudflare アカウントから削除します。元に戻せません。続行しますか？`,
      )
    ) {
      return;
    }
    setDestroying(true);
    setDestroyError("");
    setDestroyMsg("");
    try {
      const res = await fetch("/api/onboarding/destroy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, stackId: sid }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "削除できませんでした");
      setDestroyMsg(body.message ?? "削除しました");
      clearLastSite();
      setStackId("");
      setSession(null);
    } finally {
      setDestroying(false);
    }
  }

  useEffect(() => {
    void fetch("/api/onboarding/health")
      .then(async (r) => {
        const body = (await r.json()) as {
          oauthEnabled?: boolean;
          publicTrial?: boolean;
          ready?: boolean;
          ok?: boolean;
        };
        setApiReachable(true);
        setOauthEnabled(Boolean(body.oauthEnabled));
        setPublicTrial(Boolean(body.publicTrial));
        setTrialReady(body.ready !== false && body.ok !== false);
      })
      .catch(() => {
        setApiReachable(false);
        setTrialReady(false);
      });

    void fetch("/api/onboarding/help")
      .then((r) => r.json())
      .then((body: Help) => {
        setHelp(body);
        if (body.oauthEnabled) setOauthEnabled(true);
        if (body.publicTrial) setPublicTrial(true);
        if (body.ready === false) setTrialReady(false);
      })
      .catch(() => setHelp(null));

    const last = loadLastSite();
    if (last) setStackId(last.stackId);

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauth_error");
    const oauthGrant = params.get("oauth_grant");
    const oauthIntent = params.get("oauth_intent");
    if (oauthError) setError(decodeURIComponent(oauthError));
    if (oauthGrant) {
      window.history.replaceState({}, "", "/start/");
      setLoading(true);
      const grant = oauthGrant;
      if (oauthIntent === "destroy") {
        void runDestroy({ oauthGrantId: grant })
          .catch((e) => setDestroyError(e instanceof Error ? e.message : String(e)))
          .finally(() => setLoading(false));
      } else {
        void beginSession({ oauthGrantId: grant })
          .catch((e) => setError(e instanceof Error ? e.message : String(e)))
          .finally(() => setLoading(false));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- OAuth return runs once on mount
  }, []);

  useEffect(() => {
    if (!session?.id || session.status === "succeeded" || session.status === "failed") return;
    const timer = setInterval(() => {
      void fetch(`/api/onboarding/sessions/${session.id}`)
        .then((r) => r.json())
        .then((body: Session) => {
          setSession(body);
          if (body.stackId) {
            setStackId(body.stackId);
            saveLastSite(body.stackId);
          }
          if (body.status === "succeeded" && body.consoleUrl) {
            window.location.href = body.consoleUrl;
          }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, [session?.id, session?.status]);

  async function onStart() {
    setError("");
    if (!apiReachable || !trialReady) {
      setError(help?.oauth?.publicUnavailable ?? "お試しの開設は現在ご利用いただけません。");
      return;
    }
    setLoading(true);
    try {
      await beginSession({ cloudflareApiToken: token });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onOAuthLogin() {
    setError("");
    if (!apiReachable || !trialReady) {
      setError(help?.oauth?.publicUnavailable ?? "お試しの開設は現在ご利用いただけません。");
      return;
    }
    window.location.href = "/api/onboarding/oauth/start";
  }

  function onOAuthDestroy() {
    setDestroyError("");
    if (!apiReachable || !trialReady) {
      setDestroyError(help?.oauth?.publicUnavailable ?? "現在ご利用いただけません。");
      return;
    }
    if (!stackId.trim()) {
      setDestroyError("スタック ID を入力するか、このブラウザで開設したサイトを選んでください。");
      return;
    }
    window.location.href = "/api/onboarding/oauth/start?intent=destroy";
  }

  async function onDestroyWithToken() {
    setDestroyError("");
    if (!apiReachable || !trialReady) {
      setDestroyError("開設サービスに接続できません。");
      return;
    }
    if (!token.trim()) {
      setDestroyError("削除には API トークンを入力してください");
      return;
    }
    try {
      await runDestroy({ cloudflareApiToken: token });
    } catch (e) {
      setDestroyError(e instanceof Error ? e.message : String(e));
    }
  }

  const running = session?.status === "running" || session?.status === "queued";
  const stepIndex = help?.steps.findIndex((s) => s.id === session?.step) ?? -1;
  const actionsDisabled = apiReachable !== true || !trialReady || running || destroying;
  const useOAuthPrimary = oauthEnabled && trialReady;

  return (
    <div className="start-page">
      <header className="start-header">
        <h1>baserEdge</h1>
        <p>Cloudflare アカウントで、サイトの管理をはじめます。</p>
      </header>

      {apiReachable === false && (
        <p className="error banner-error">
          {publicTrial
            ? (help?.oauth?.publicUnavailable ??
              "お試しの開設サービスに接続できません。しばらくしてから再度お試しください。")
            : "開設サービス（API）に接続できません。ローカル検証では npm run dev:onboarding を実行してください。"}
        </p>
      )}

      {apiReachable === true && !trialReady && (
        <p className="error banner-error">
          {help?.oauth?.publicUnavailable ?? help?.oauth?.notConfiguredNote ?? "お試しは現在ご利用いただけません。"}
        </p>
      )}

      <section className="start-card">
        <h2>1. Cloudflare アカウント</h2>
        <p>
          まだの方は{" "}
          <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer">
            無料でアカウント作成
          </a>
          してから戻ってください。
        </p>

        <h2>2. Cloudflare に接続</h2>

        {useOAuthPrimary ? (
          <>
            <p>{help?.oauth?.title ?? "Cloudflare でログインして、サイトを開設します。"}</p>
            <ol className="guide-steps oauth-steps">
              {(help?.oauth?.steps ?? [
                "下のボタンを押す",
                "Cloudflare にログインし、アカウントと権限を確認して Authorize",
                "自動的に戻り、サイト開設が始まります",
              ]).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <button
              type="button"
              className="btn-primary"
              disabled={loading || actionsDisabled}
              onClick={onOAuthLogin}
            >
              {running || loading ? "接続しています…" : "Cloudflare でログインしてサイトを開設"}
            </button>
            {showManualToken && (
              <details className="token-guide manual-fallback">
                <summary>{help?.oauth?.fallbackSummary ?? "うまくいかないとき（手動で API トークン）"}</summary>
                {help?.tokenGuide && (
                  <>
                    <p className="guide-intro">{help.tokenGuide.intro}</p>
                    <p>
                      <a
                        className="btn-secondary"
                        href={help.createCustomTokenUrl ?? help.createTokenUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Cloudflare の API トークン画面を開く
                      </a>
                    </p>
                    <ol className="guide-steps">
                      {help.tokenGuide.steps.map((s) => (
                        <li key={s.title}>
                          <strong>{s.title}</strong>
                          <span>{s.body}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                <p className="field-label">API トークンを貼り付け</p>
                <textarea
                  className="token-input"
                  rows={3}
                  placeholder="API トークン"
                  value={token}
                  disabled={actionsDisabled}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loading || actionsDisabled || !token.trim()}
                  onClick={() => void onStart()}
                >
                  トークンで開設
                </button>
              </details>
            )}
          </>
        ) : (
          <>
            <p className="note">{help?.oauth?.notConfiguredNote ?? help?.tokenGuide?.intro}</p>
            {showManualToken && help?.tokenGuide && (
              <details className="token-guide" open>
                <summary>{help.tokenGuide.summary}</summary>
                <p className="guide-intro">{help.tokenGuide.intro}</p>
                <p>
                  <a
                    className="btn-secondary"
                    href={help.createCustomTokenUrl ?? help.createTokenUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cloudflare の API トークン画面を開く
                  </a>
                </p>
                <ol className="guide-steps">
                  {help.tokenGuide.steps.map((s) => (
                    <li key={s.title}>
                      <strong>{s.title}</strong>
                      <span>{s.body}</span>
                    </li>
                  ))}
                </ol>
                <table className="perm-table">
                  <caption>Permissions に追加する3行</caption>
                  <thead>
                    <tr>
                      <th>1列目</th>
                      <th>2列目</th>
                      <th>3列目</th>
                      <th>意味</th>
                    </tr>
                  </thead>
                  <tbody>
                    {help.tokenGuide.permissionRows.map((row) => (
                      <tr key={row.labelJa}>
                        <td>
                          <code>{row.column1}</code>
                        </td>
                        <td>
                          <code>{row.column2}</code>
                        </td>
                        <td>
                          <code>{row.column3}</code>
                        </td>
                        <td>{row.labelJa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
            {showManualToken && (
              <>
                <p className="field-label">API トークンを貼り付け</p>
                <textarea
                  className="token-input"
                  rows={3}
                  placeholder="API トークンを貼り付け"
                  value={token}
                  disabled={actionsDisabled}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading || actionsDisabled || !token.trim()}
                  onClick={() => void onStart()}
                >
                  {running ? "サイトを開設しています…" : "Cloudflare に接続してサイトを開設"}
                </button>
              </>
            )}
          </>
        )}

        {help?.safetyNote && <p className="note">{help.safetyNote}</p>}
        {help?.trialNote && <p className="note">{help.trialNote}</p>}

        {error && <p className="error">{error}</p>}
        {session?.error && <p className="error">{session.error}</p>}

        {running && help && (
          <ol className="progress-steps">
            {help.steps.map((s, i) => (
              <li key={s.id} className={i < stepIndex ? "done" : i === stepIndex ? "active" : ""}>
                {s.label}
              </li>
            ))}
          </ol>
        )}
        {session?.message && running && <p className="status-msg">{session.message}</p>}
        {session?.accountName && <p className="muted">アカウント: {session.accountName}</p>}

        {session?.status === "succeeded" && session.consoleUrl && (
          <p>
            <a className="btn-primary" href={session.consoleUrl}>
              管理画面を開く
            </a>
          </p>
        )}
      </section>

      <section className="start-card destroy-card">
        <h2>お試しをやめる</h2>
        {help?.teardownUrl ? (
          <>
            <p className="note">
              Cloudflare にログインして許可するだけです。お試し環境（trial）だけを削除し、他のリソースには触れません。復元できません。
            </p>
            <a className="btn-danger" href={help.teardownUrl}>
              お試しをやめる
            </a>
          </>
        ) : (
          <>
            <p className="note">
              {useOAuthPrimary
                ? (help?.oauth?.destroyTitle ??
                  "削除するときも Cloudflare にログインして許可するだけです（同じアカウントである必要があります）。")
                : "削除には開設時と同じ API トークンが必要です。"}
            </p>
            {help?.provisionStackId !== "trial" && (
              <>
                <label className="field-label" htmlFor="stack-id">
                  スタック ID
                </label>
                <input
                  id="stack-id"
                  className="stack-input"
                  type="text"
                  placeholder="ob-…（開設時にこのブラウザへ保存）"
                  value={stackId}
                  disabled={actionsDisabled}
                  onChange={(e) => setStackId(e.target.value)}
                />
              </>
            )}
            {useOAuthPrimary ? (
              <button
                type="button"
                className="btn-danger"
                disabled={actionsDisabled || (help?.provisionStackId !== "trial" && !stackId.trim())}
                onClick={onOAuthDestroy}
              >
                {destroying ? "削除しています…" : (help?.oauth?.destroyButton ?? "Cloudflare でログインして削除")}
              </button>
            ) : (
              <button
                type="button"
                className="btn-danger"
                disabled={actionsDisabled || !token.trim() || !stackId.trim()}
                onClick={() => void onDestroyWithToken()}
              >
                {destroying ? "削除しています…" : "このサイトを削除"}
              </button>
            )}
            {destroyMsg && <p className="success-msg">{destroyMsg}</p>}
            {destroyError && <p className="error">{destroyError}</p>}
          </>
        )}
      </section>

      <footer className="start-footer">
        <p>開設後は管理画面で「管理をはじめる」を押してください（実証用の簡易ログイン）。</p>
      </footer>
    </div>
  );
}
