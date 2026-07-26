import { cloudflareOAuthConfigured } from "./cloudflare-auth-routes.js";
import { instantLoginEnabled, isProductionEnv, type AuthEnv } from "./auth-routes.js";

export type ConsoleCapabilities = {
  assetPublicDelivery: boolean;
  assetStorage: "r2" | "memory";
  environment: "production" | "preview";
  instantLogin: boolean;
  cloudflareLogin: boolean;
  publicSiteUrl: string | null;
};

export type PlatformEnv = AuthEnv & {
  R2?: unknown;
  PUBLIC_BASE_URL?: string;
  PREVIEW_BASE_URL?: string;
};

/** Whether uploaded assets can be served on the public site (`/assets/…`). Requires API Worker R2 binding (deploy scripts set public worker too). */
export function resolveConsoleCapabilities(env: PlatformEnv): ConsoleCapabilities {
  const assetPublicDelivery = Boolean(env.R2);
  return {
    assetPublicDelivery,
    assetStorage: assetPublicDelivery ? "r2" : "memory",
    environment: isProductionEnv(env) ? "production" : "preview",
    instantLogin: instantLoginEnabled(env),
    cloudflareLogin: cloudflareOAuthConfigured(env),
    publicSiteUrl: pickPublicSiteUrl(env),
  };
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

function isPlaceholderUrl(value: string): boolean {
  return value.includes("example.invalid");
}
