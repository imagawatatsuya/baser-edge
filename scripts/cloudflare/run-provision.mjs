import { describeStack, isTrialNoR2 } from "./stack.mjs";
import { loadState, saveState, patchWranglerBindings, wrangler, statePath } from "./shared.mjs";

export async function runProvision(log = console.log) {
  const { d1: D1_NAME, r2: R2_NAME } = describeStack();
  const trialNoR2 = isTrialNoR2();

  let state = loadState() ?? {
    stackId: describeStack().stackId,
    d1DatabaseName: D1_NAME,
    d1DatabaseId: null,
    siteId: null,
    bootstrapped: false,
    apiUrl: null,
    publicUrl: null,
    trialNoR2,
  };
  if (trialNoR2) state.trialNoR2 = true;
  else state.trialNoR2 = false;

  if (!state.d1DatabaseId) {
    log(`Creating D1 database "${D1_NAME}"…`);
    const out = wrangler(["d1", "create", D1_NAME], { silent: true });
    const match = out.match(/database_id\s*=\s*([0-9a-f-]{36})/i) ?? out.match(/"uuid":\s*"([0-9a-f-]{36})"/i);
    if (!match?.[1]) throw new Error(`Could not parse D1 database_id from:\n${out}`);
    state.d1DatabaseId = match[1];
    log(`D1 database_id: ${state.d1DatabaseId}`);
  }

  patchWranglerBindings({ databaseId: state.d1DatabaseId, d1Name: D1_NAME, r2Name: R2_NAME });

  if (trialNoR2) {
    log("Trial mode (BASER_TRIAL_NO_R2): skipping R2 bucket.");
  } else {
    log(`Ensuring R2 bucket "${R2_NAME}"…`);
    try {
      wrangler(["r2", "bucket", "create", R2_NAME], { silent: true });
      log("R2 bucket created.");
    } catch (e) {
      const msg = String(e);
      if (msg.includes("already exists") || msg.includes("409")) {
        log("R2 bucket already exists.");
      } else {
        throw e;
      }
    }
  }

  saveState(state);
  log(`Saved state to ${statePath}`);
  return state;
}
