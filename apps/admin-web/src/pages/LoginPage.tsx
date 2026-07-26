import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clearSession, completeCloudflareOAuthLogin, fetchCloudflareEntry, fetchInstantEntry, getSession, loginInstant, loginWithPasskey, startCloudflareLogin, syncCsrfFromCookies, fetchLoginHint } from "../api/client";
import { cacheDevPublicUrl } from "../lib/localDevUrls";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("error") ?? "");
  const [loading, setLoading] = useState(false);
  const [instant, setInstant] = useState<{ siteName: string } | null>(null);
  const [cloudflare, setCloudflare] = useState<{ mode: "oauth" | "access" } | null>(null);

  useEffect(() => {
    if (searchParams.get("oauth") !== "complete") return;
    setLoading(true);
    setStatus("ログインを完了しています…");
    void completeCloudflareOAuthLogin(searchParams)
      .then((session) => {
        setSession(session);
        navigate("/content", { replace: true });
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : String(error));
        setLoading(false);
      });
  }, [searchParams, setSession, navigate]);

  useEffect(() => {
    syncCsrfFromCookies();
    if (getSession() && !syncCsrfFromCookies()) {
      clearSession();
    }
    void fetchCloudflareEntry().then((entry) => {
      if (entry.available) setCloudflare({ mode: entry.mode ?? "oauth" });
    }).catch(() => {});
    void fetchInstantEntry().then((entry) => {
      if (entry.publicUrl) cacheDevPublicUrl(entry.publicUrl);
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

  function onCloudflareLogin() {
    setLoading(true);
    setStatus("Cloudflare に接続しています…");
    startCloudflareLogin(cloudflare?.mode ?? "oauth");
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
        {cloudflare ? (
          <>
            <h1>管理画面にログイン</h1>
            <p>このサイトを開設した Cloudflare アカウントでログインします。</p>
            <button type="button" className="btn btn-primary" style={{ width: "100%", fontSize: "1.05rem", padding: "0.85rem" }} disabled={loading} onClick={onCloudflareLogin}>
              Cloudflare でログイン
            </button>
          </>
        ) : instant ? (
          <>
            <h1>サイトの準備ができました</h1>
            <p>
              <strong>{instant.siteName}</strong> の管理画面です。ボタンを押すだけで、ページの作成や公開ができます。
            </p>
            <button type="button" className="btn btn-primary" style={{ width: "100%", fontSize: "1.05rem", padding: "0.85rem" }} disabled={loading} onClick={() => void onInstantStart()}>
              管理をはじめる
            </button>
            <p className="status" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
              実証デモ用の簡易ログインです（本番では Cloudflare OAuth または Passkey を利用します）。
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
