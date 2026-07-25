/** Cloudflare resource names for BASER_CF_STACK=trial (must match scripts/cloudflare/stack.mjs). */
export const TRIAL_STACK_ID = "trial" as const;

export const TRIAL_API_WORKER = "baser-edge-api-trial";
export const TRIAL_PUBLIC_WORKER = "baser-edge-public-trial";
export const TRIAL_D1_NAME = "baser-edge-trial";
export const TRIAL_R2_BUCKET = "baser-edge-assets-trial";

export function isAllowedTrialStackId(stackId: string): boolean {
  return stackId === TRIAL_STACK_ID;
}
