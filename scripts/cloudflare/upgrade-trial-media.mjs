import { isTrialNoR2 } from "./stack.mjs";
import { isR2Available } from "./r2-available.mjs";
import { ensureWranglerR2Bindings } from "./ensure-wrangler-r2.mjs";
import { runProvision } from "./run-provision.mjs";
import { loadState, saveState } from "./shared.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} state
 * @param {{ trialNoR2Mode: boolean, r2Available: boolean }} flags
 */
export function needsTrialMediaUpgrade(state, { trialNoR2Mode, r2Available }) {
  if (!state?.d1DatabaseId) return false;
  if (state.trialNoR2 === false) return false;
  if (trialNoR2Mode) return false;
  return r2Available;
}

/** @param {Record<string, unknown> | null | undefined} state */
export function shouldUpgradeTrialMedia(state) {
  return needsTrialMediaUpgrade(state, {
    trialNoR2Mode: isTrialNoR2(),
    r2Available: isR2Available(),
  });
}

/**
 * Add R2 bucket + wrangler bindings to an existing trial-no-R2 stack.
 * Caller should redeploy workers after this (runProve / enable-media do).
 *
 * @param {{ log?: (...args: unknown[]) => void, state?: Record<string, unknown> | null }} [options]
 */
export async function upgradeTrialMediaStack(options = {}) {
  const log = options.log ?? console.log;
  let state = options.state ?? loadState();
  if (!shouldUpgradeTrialMedia(state)) {
    return { upgraded: false, state };
  }
  log("");
  log("Cloudflare R2 が利用可能です。既存スタックにメディア配信（R2）を追加します…");
  log("（R2 有効化前にアップロードした画像は、公開配信のために再アップロードが必要です）");
  log("");
  process.env.BASER_TRIAL_NO_R2 = "0";
  ensureWranglerR2Bindings({ log });
  state = await runProvision(log);
  state.trialNoR2 = false;
  saveState(state);
  return { upgraded: true, state };
}
