import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { ConsoleCapabilities } from "../api/types";

export function useConsoleCapabilities() {
  const [capabilities, setCapabilities] = useState<ConsoleCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

  return { capabilities, error };
}
