/** Trial OAuth workers have no R2; inline asset bytes live in D1. */
export const TRIAL_INLINE_ASSET_STORAGE = "d1-inline" as const;

export function trialPublicWorkerVars(input: {
  siteId: string;
  turnstileSiteKey?: string;
}): Record<string, string> {
  return {
    SITE_ID: input.siteId,
    ASSET_BASE_URL: "/assets",
    BASER_ASSET_STORAGE: TRIAL_INLINE_ASSET_STORAGE,
    TURNSTILE_SITE_KEY: input.turnstileSiteKey ?? "",
  };
}

export function trialApiWorkerVars(input: {
  apiUrl: string;
  publicUrl: string;
  instantLogin?: string;
  ownerHint?: string;
}): Record<string, string> {
  return {
    BASER_ENV: "preview",
    PUBLIC_BASE_URL: input.apiUrl,
    PREVIEW_BASE_URL: input.publicUrl,
    PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
    BASER_ASSET_STORAGE: TRIAL_INLINE_ASSET_STORAGE,
    BASER_INSTANT_LOGIN: input.instantLogin ?? "false",
    BASER_INSTANT_OWNER_HINT: input.ownerHint ?? "",
  };
}
