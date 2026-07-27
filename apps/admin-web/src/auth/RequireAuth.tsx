import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { hasAuthenticatedSession, syncCsrfFromCookies, verifySession } from "../api/client";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [checked, setChecked] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      syncCsrfFromCookies();
      if (!session?.siteId || !hasAuthenticatedSession()) {
        if (!cancelled) {
          setValid(false);
          setChecked(true);
        }
        return;
      }
      const ok = await verifySession();
      if (!cancelled) {
        setValid(ok);
        setChecked(true);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [session]);

  if (!checked) {
    return (
      <div className="login-page" style={{ minHeight: "100vh", padding: "1rem" }}>
        <p className="status">認証を確認しています…</p>
      </div>
    );
  }
  if (!valid) return <Navigate to="/login" replace />;
  return children;
}
