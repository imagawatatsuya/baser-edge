import { describeStack, isTrialNoR2 } from "./stack.mjs";
import { d1DatabaseIdFromListJson, parseD1DatabaseIdFromOutput } from "./parse-d1-id.mjs";
import { loadState, saveState, patchWranglerBindings, wrangler, wranglerResult, statePath, displayPath } from "./shared.mjs";

function resolveD1DatabaseId(databaseName) {
  const listed = wranglerResult(["d1", "list", "--json"], { silent: true });
  if (!listed.ok) {
    throw new Error(`wrangler d1 list failed (${listed.status}): ${listed.stderr || listed.stdout}`);
  }
  const id = d1DatabaseIdFromListJson(JSON.parse(listed.stdout), databaseName);
  if (!id) throw new Error(`D1 database "${databaseName}" not found in account (wrangler d1 list).`);
  return id;
}

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
    const created = wranglerResult(["d1", "create", D1_NAME], { silent: true });
    const combined = `${created.stdout}\n${created.stderr}`;
    if (created.ok) {
      state.d1DatabaseId = parseD1DatabaseIdFromOutput(combined);
      if (!state.d1DatabaseId) {
        throw new Error(`Could not parse D1 database_id from:\n${combined}`);
      }
    } else if (/already exists/i.test(combined)) {
      log(`D1 database "${D1_NAME}" already exists; looking up database_id…`);
      state.d1DatabaseId = resolveD1DatabaseId(D1_NAME);
    } else {
      throw new Error(`wrangler d1 create failed (${created.status}): ${combined}`);
    }
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
  log(`Saved state to ${displayPath(statePath)}`);
  return state;
}
