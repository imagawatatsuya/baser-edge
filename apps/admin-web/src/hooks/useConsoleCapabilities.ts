import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { ConsoleCapabilities } from "../api/types";

export function useConsoleCapabilities() {
  const [capabilities, setCapabilities] = useState<ConsoleCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void apiFetch<ConsoleCapabilities>("/v1/console/capabilities")
      .then((data) => {
        if (!cancelled) setCapabilities(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "capabilities を取得できません");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { capabilities, error, reload };
}
