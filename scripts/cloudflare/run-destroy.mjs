import { existsSync, unlinkSync } from "node:fs";
import { ensureLoggedIn, loadState, wrangler, displayPath } from "./shared.mjs";
import { resetWranglerConfigsToTemplate } from "./wrangler-template-reset.mjs";
import {
  apiWorkerName,
  publicWorkerName,
  d1DatabaseName,
  r2BucketName,
  resolveStatePath,
  wranglerApiConfigRel,
  wranglerPublicConfigRel,
  isTrialNoR2,
} from "./stack.mjs";

/**
 * @param {{ log?: (...args: unknown[]) => void }} [options]
 * @returns {Promise<{ removed: { apiWorker: boolean, publicWorker: boolean, d1: boolean, r2: boolean }, anyRemoved: boolean }>}
 */
export async function runDestroy(options = {}) {
  const log = options.log ?? console.log;
  ensureLoggedIn();

  const state = loadState();
  const skipR2 = state?.trialNoR2 !== false && (state?.trialNoR2 === true || isTrialNoR2());
  const apiConfig = wranglerApiConfigRel();
  const publicConfig = wranglerPublicConfigRel();

  const removed = { apiWorker: false, publicWorker: false, d1: false, r2: false };

  log("Destroying workers and database…");

  function tryDelete(label, fn) {
    try {
      fn();
      log(label);
      return true;
    } catch (e) {
      const msg = String(e);
      const absent = msg.includes("not found") || msg.includes("10007");
      log(absent ? `${label.split(":")[0]}: already absent` : `${label}: ${msg}`);
      return false;
    }
  }

  removed.apiWorker = tryDelete(`Deleted worker: ${apiWorkerName()}`, () => {
    wrangler(["delete", apiWorkerName(), "--config", apiConfig, "--force"], { silent: true });
  });

  removed.publicWorker = tryDelete(`Deleted worker: ${publicWorkerName()}`, () => {
    wrangler(["delete", publicWorkerName(), "--config", publicConfig, "--force"], { silent: true });
  });

  const dbName = state?.d1DatabaseName ?? d1DatabaseName();
  removed.d1 = tryDelete(`Deleted D1: ${dbName}`, () => {
    wrangler(["d1", "delete", dbName], { silent: true });
  });

  if (!skipR2) {
    removed.r2 = tryDelete(`Deleted R2: ${r2BucketName()}`, () => {
      wrangler(["r2", "bucket", "delete", r2BucketName()], { silent: true });
    });
  } else {
    log("Skipped R2 (trial / BASER_TRIAL_NO_R2).");
  }

  const stateFile = resolveStatePath();
  if (existsSync(stateFile)) {
    unlinkSync(stateFile);
    log(`Removed state file: ${displayPath(stateFile)}`);
  }

  resetWranglerConfigsToTemplate();
  log("Reverted wrangler configs to repository placeholders (REPLACE_ME / example.invalid).");

  const anyRemoved = removed.apiWorker || removed.publicWorker || removed.d1 || removed.r2;
  log("Stack teardown finished.");
  return { removed, anyRemoved };
}
