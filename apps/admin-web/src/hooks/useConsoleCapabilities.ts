import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { ConsoleCapabilities } from "../api/types";
import { loadConsoleQuery, peekConsoleQuery } from "../lib/consoleQueryCache";
import { cacheConsolePublicSiteUrl } from "../lib/localDevUrls";

const CAPABILITIES_PATH = "/v1/console/capabilities";
const CAPABILITIES_MAX_AGE_MS = 5 * 60_000;

export function useConsoleCapabilities() {
  const [capabilities, setCapabilities] = useState<ConsoleCapabilities | null>(() => (
    peekConsoleQuery<ConsoleCapabilities>(CAPABILITIES_PATH, CAPABILITIES_MAX_AGE_MS)
  ));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void loadConsoleQuery(
      CAPABILITIES_PATH,
      () => apiFetch<ConsoleCapabilities>(CAPABILITIES_PATH),
      { fresh: refreshKey > 0, maxAgeMs: CAPABILITIES_MAX_AGE_MS },
    )
      .then((data) => {
        if (!cancelled) {
          cacheConsolePublicSiteUrl(data.publicSiteUrl);
          setCapabilities(data);
        }
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
