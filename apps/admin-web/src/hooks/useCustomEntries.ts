import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export type CustomEntrySnapshot = {
  entry: { id: string; lockVersion: number; slug: string | null };
  workingRevision: { id: string; values: Record<string, unknown> };
  publishedRevision: { id: string } | null;
};

export type CustomEntriesState = {
  entries: CustomEntrySnapshot[];
  error: string;
  reload: () => Promise<void>;
};

const CustomEntriesContext = createContext<CustomEntriesState | null>(null);

export function useCustomEntries(definitionId: string) {
  const { session } = useAuth();
  const [entries, setEntries] = useState<CustomEntrySnapshot[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!session || !definitionId) return;
    const list = await apiFetch<CustomEntrySnapshot[]>(
      `/v1/custom-contents/${encodeURIComponent(definitionId)}/entries`,
    );
    setEntries(list);
    setError("");
  }, [session, definitionId]);

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reload]);

  return { entries, error, reload };
}

export function CustomEntriesProvider({ value, children }: { value: CustomEntriesState; children: ReactNode }) {
  return createElement(CustomEntriesContext.Provider, { value }, children);
}

export function useCustomEntriesContext(): CustomEntriesState {
  const ctx = useContext(CustomEntriesContext);
  if (!ctx) throw new Error("useCustomEntriesContext must be used within CustomEntriesLayout");
  return ctx;
}
