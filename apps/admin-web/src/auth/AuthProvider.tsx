import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionState } from "../api/types";
import { AUTH_EXPIRED_EVENT, clearSession, getSession, saveSession, syncCsrfFromCookies } from "../api/client";

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
    const onExpired = () => setSessionState(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    setSession: (next) => {
      if (next) saveSession(next);
      else clearSession();
      setSessionState(next);
    },
    logout: () => {
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
