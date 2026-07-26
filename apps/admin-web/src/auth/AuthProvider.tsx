import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionState } from "../api/types";
import { AUTH_EXPIRED_EVENT, clearSession, getSession, saveSession, syncCsrfFromCookies } from "../api/client";
import { invalidateSiteContentViews } from "../lib/siteViewSync";

type AuthContextValue = {
  session: SessionState | null;
  setSession: (session: SessionState | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionState | null>(() => {
    syncCsrfFromCookies();
    return getSession();
  });

  useEffect(() => {
    const onExpired = () => {
      invalidateSiteContentViews();
      setSessionState(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    setSession: (next) => {
      const prev = getSession();
      if (!next || (prev?.siteId && next.siteId !== prev.siteId)) {
        invalidateSiteContentViews();
      }
      if (next) saveSession(next);
      else clearSession();
      setSessionState(next);
    },
    logout: () => {
      invalidateSiteContentViews();
      clearSession();
      setSessionState(null);
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider required");
  return ctx;
}
