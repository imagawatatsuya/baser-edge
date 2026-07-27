import { isD1InlineAssetStorageEnabled } from "@baser-edge/cloudflare-adapters";
import { TRIAL_INLINE_MAX_ASSETS, TRIAL_INLINE_MAX_BYTES_PER_OBJECT } from "@baser-edge/asset-kernel";
import { cloudflareOAuthConfigured } from "./cloudflare-auth-routes.js";
import { instantLoginEnabled, isProductionEnv, type AuthEnv } from "./auth-routes.js";

export type ConsoleCapabilities = {
  assetPublicDelivery: boolean;
  assetStorage: "r2" | "memory" | "d1-inline";
  environment: "production" | "preview";
  instantLogin: boolean;
  cloudflareLogin: boolean;
  publicSiteUrl: string | null;
  trialInlineMedia?: {
    maxAssets: number;
    maxBytesPerObject: number;
  };
};

export type PlatformEnv = AuthEnv & {
  R2?: unknown;
  DB?: unknown;
  BASER_ASSET_STORAGE?: string;
  PUBLIC_BASE_URL?: string;
  PREVIEW_BASE_URL?: string;
};

/** Whether uploaded assets can be served on the public site (`/assets/…`). */
export function resolveConsoleCapabilities(env: PlatformEnv): ConsoleCapabilities {
  if (env.R2) {
    return {
      assetPublicDelivery: true,
      assetStorage: "r2",
      environment: isProductionEnv(env) ? "production" : "preview",
      instantLogin: instantLoginEnabled(env),
      cloudflareLogin: cloudflareOAuthConfigured(env),
      publicSiteUrl: pickPublicSiteUrl(env),
    };
  }
  if (isD1InlineAssetStorageEnabled(env)) {
    return {
      assetPublicDelivery: true,
      assetStorage: "d1-inline",
      environment: isProductionEnv(env) ? "production" : "preview",
      instantLogin: instantLoginEnabled(env),
      cloudflareLogin: cloudflareOAuthConfigured(env),
      publicSiteUrl: pickPublicSiteUrl(env),
      trialInlineMedia: {
        maxAssets: TRIAL_INLINE_MAX_ASSETS,
        maxBytesPerObject: TRIAL_INLINE_MAX_BYTES_PER_OBJECT,
      },
    };
  }
  return {
    assetPublicDelivery: false,
    assetStorage: "memory",
    environment: isProductionEnv(env) ? "production" : "preview",
    instantLogin: instantLoginEnabled(env),
    cloudflareLogin: cloudflareOAuthConfigured(env),
    publicSiteUrl: pickPublicSiteUrl(env),
  };
}

function isPlaceholderUrl(value: string): boolean {
  return value.includes("example.invalid");
}

/** Origin for signed upload PUT URLs (always the API worker). */
export function resolveUploadBaseUrl(env: PlatformEnv, requestUrl: URL): string {
  const pub = env.PUBLIC_BASE_URL?.trim();
  if (pub && !isPlaceholderUrl(pub)) {
    try {
      return new URL(pub).origin;
    } catch {
      /* fall through */
    }
  }
  return requestUrl.origin;
}

/** Public site base for previews and `/assets/…` (public worker when configured). */
export function resolvePreviewBaseUrl(env: PlatformEnv, requestUrl: URL): string {
  const picked = pickPublicSiteUrl(env);
  if (picked) return picked;
  return requestUrl.origin;
}

function pickPublicSiteUrl(env: PlatformEnv): string | null {
  const preview = env.PREVIEW_BASE_URL?.trim();
  const pub = env.PUBLIC_BASE_URL?.trim();
  const candidate = preview && !isPlaceholderUrl(preview) ? preview : pub;
  if (!candidate || isPlaceholderUrl(candidate)) return null;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
