const PUBLIC_URL_CACHE_KEY = "baser-dev-public-url";
const DEFAULT_API_PORT = 8787;
const DEFAULT_PUBLIC_PORT = 8788;

/** Console URL when API and admin are served by `npm run dev:stack`. */
export function devStackConsoleUrl(): string {
  if (typeof window !== "undefined") {
    return new URL("/console/", window.location.origin).href;
  }
  return `http://localhost:${DEFAULT_API_PORT}/console/`;
}

export function isPlaceholderPublicUrl(value: string | undefined | null): boolean {
  const normalized = value?.trim();
  return !normalized || normalized.includes("example.invalid");
}

export function cacheDevPublicUrl(publicUrl: string | undefined): void {
  const normalized = publicUrl?.trim().replace(/\/$/, "");
  if (normalized && !isPlaceholderPublicUrl(normalized) && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(PUBLIC_URL_CACHE_KEY, normalized);
  }
}

/** Persist API-reported public site origin (OAuth trial when session.publicUrl is empty). */
export function cacheConsolePublicSiteUrl(publicSiteUrl: string | null | undefined): void {
  cacheDevPublicUrl(publicSiteUrl ?? undefined);
}

export function localPublicOriginFallback(): string {
  if (typeof sessionStorage !== "undefined") {
    const cached = sessionStorage.getItem(PUBLIC_URL_CACHE_KEY);
    if (cached && !isPlaceholderPublicUrl(cached)) return cached;
  }
  const envUrl = import.meta.env.VITE_BASER_STACK_PUBLIC_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const envPort = import.meta.env.VITE_BASER_STACK_PUBLIC_PORT as string | undefined;
  if (envPort) return `http://localhost:${envPort}`;
  return `http://localhost:${DEFAULT_PUBLIC_PORT}`;
}

export function resolvePublicSiteOrigin(session: { publicUrl?: string } | null | undefined): string {
  const fromSession = session?.publicUrl?.trim();
  if (fromSession && !isPlaceholderPublicUrl(fromSession)) return fromSession.replace(/\/$/, "");
  return localPublicOriginFallback();
}
