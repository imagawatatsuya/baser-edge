import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, fetchInstantEntry, getSession, loginInstant, loginWithPasskey, syncCsrfFromCookies, fetchLoginHint } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [instant, setInstant] = useState<{ siteName: string } | null>(null);

  useEffect(() => {
    syncCsrfFromCookies();
    if (getSession() && !syncCsrfFromCookies()) {
      clearSession();
    }
    void fetchInstantEntry().then((entry) => {
      if (entry.available && entry.siteName) {
        setInstant({ siteName: entry.siteName });
      }
    }).catch(() => {});
  }, []);

  async function onInstantStart() {
    setLoading(true);
    setStatus("準備しています…");
    try {
      const session = await loginInstant();
      setSession(session);
      navigate("/content", { replace: true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }

  async function onPasskeyLogin() {
    setLoading(true);
    setStatus("ログイン中…");
    try {
      const hint = await fetchLoginHint();
      const session = await loginWithPasskey(hint);
      setSession(session);
      navigate("/content", { replace: true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {instant ? (
          <>
            <h1>サイトの準備ができました</h1>
            <p>
              <strong>{instant.siteName}</strong> の管理画面です。ボタンを押すだけで、ページの作成や公開ができます。
            </p>
            <button type="button" className="btn btn-primary" style={{ width: "100%", fontSize: "1.05rem", padding: "0.85rem" }} disabled={loading} onClick={() => void onInstantStart()}>
              管理をはじめる
            </button>
            <p className="status" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
              実証デモ用の簡易ログインです（本番では Passkey を利用します）。
            </p>
          </>
        ) : (
          <>
            <h1>管理画面にログイン</h1>
            <p>Passkey でログインします。</p>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={loading} onClick={() => void onPasskeyLogin()}>
              Passkey でログイン
            </button>
          </>
        )}
        <p className={`status ${status && !loading ? "status-error" : ""}`} style={{ marginTop: "1rem" }}>{status}</p>
      </div>
    </div>
  );
}
