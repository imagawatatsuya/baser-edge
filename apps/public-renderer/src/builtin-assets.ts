import {
  STARTER_HOME_HERO_BASE64,
  STARTER_HOME_HERO_CONTENT_TYPE,
  STARTER_HOME_HERO_SHA256,
} from "./generated/starter-home-hero.js";
import { BUILTIN_STARTER_HOME_HERO_ASSET_ID } from "@baser-edge/structured-document";

export const BUILTIN_STARTER_HOME_HERO_PATH = "/__baser/builtin-assets/starter-home-hero.webp";

const STARTER_HOME_HERO_ETAG = `"${STARTER_HOME_HERO_SHA256}"`;

let cachedStarterHeroBytes: Uint8Array | undefined;

function starterHomeHeroBytes(): Uint8Array {
  if (!cachedStarterHeroBytes) {
    const binary = atob(STARTER_HOME_HERO_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    cachedStarterHeroBytes = bytes;
  }
  return cachedStarterHeroBytes;
}

export function resolveBuiltinPublicAssetUrl(assetId: string): string | null {
  if (assetId === BUILTIN_STARTER_HOME_HERO_ASSET_ID) return BUILTIN_STARTER_HOME_HERO_PATH;
  return null;
}

export function createPublicAssetUrlResolver(assetBase: string): (assetId: string) => string {
  const base = assetBase.replace(/\/$/, "");
  return (assetId) => {
    const builtinPath = resolveBuiltinPublicAssetUrl(assetId);
    if (builtinPath) return builtinPath;
    return `${base}/${encodeURIComponent(assetId)}`;
  };
}

export function serveBuiltinAssetRequest(request: Request, pathname: string): Response | null {
  if (pathname.startsWith("/__baser/builtin-assets/") && pathname !== BUILTIN_STARTER_HOME_HERO_PATH) {
    return new Response("Not Found", { status: 404 });
  }
  if (pathname !== BUILTIN_STARTER_HOME_HERO_PATH) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const headers = new Headers({
    "content-type": STARTER_HOME_HERO_CONTENT_TYPE,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    etag: STARTER_HOME_HERO_ETAG,
  });
  if (request.headers.get("if-none-match") === STARTER_HOME_HERO_ETAG) {
    return new Response(null, { status: 304, headers });
  }
  const bytes = starterHomeHeroBytes();
  headers.set("content-length", String(bytes.length));
  return new Response(request.method === "HEAD" ? null : bytes, { headers });
}

export function serveBuiltinAssetByRawId(request: Request, rawAssetId: string): Response | null {
  try {
    const assetId = decodeURIComponent(rawAssetId);
    if (assetId !== BUILTIN_STARTER_HOME_HERO_ASSET_ID) return null;
  } catch {
    return null;
  }
  return serveBuiltinAssetRequest(request, BUILTIN_STARTER_HOME_HERO_PATH);
}
