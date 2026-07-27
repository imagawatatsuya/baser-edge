#!/usr/bin/env node
/**
 * Redeploy OAuth trial workers (baser-edge-api-trial / baser-edge-public-trial) with
 * current source + D1 migrations (incl. 0011) + BASER_ASSET_STORAGE=d1-inline.
 *
 *   npm run refresh:oauth-trial -- --yes
 *
 * Consent: BASER_CF_PROVE=1, or pass --yes after `--`.
 * cmd.exe:  set BASER_CF_PROVE=1  (then npm run …)
 * PowerShell: $env:BASER_CF_PROVE="1"
 */
import { runProvision } from "./run-provision.mjs";
import { applyD1MigrationsRemote } from "./apply-d1-migrations.mjs";
import { resolveOAuthTrialSiteId, probeWorkersDevUrl } from "./resolve-oauth-trial-site.mjs";
import {
  apiWorkerName,
  publicWorkerName,
  d1DatabaseName,
  isTrialNoR2,
  requireProveConsent,
  wranglerDeployApiArgs,
  wranglerDeployPublicArgs,
} from "./stack.mjs";
import {
  ensureLoggedIn,
  loadState,
  saveState,
  patchPublicSiteId,
  patchWranglerBindings,
  run,
  wrangler,
  displayPath,
  statePath,
} from "./shared.mjs";
import { extractWorkerUrl, patchWranglerApiUrls } from "./wrangler-vars.mjs";
import { pushApiSecrets, pushPublicSecrets } from "./push-secrets.mjs";
import { ensureTrialInlineWranglerVars } from "./ensure-trial-inline-wrangler.mjs";
import { resetWranglerConfigsToTemplate } from "./wrangler-template-reset.mjs";

if (process.env.BASER_CF_STACK !== "trial") {
  console.error("Internal error: BASER_CF_STACK must be trial (use npm run refresh:oauth-trial).");
  process.exit(1);
}

requireProveConsent("refresh:oauth-trial");
ensureLoggedIn();

let state = await runProvision(console.log);
const dbName = state.d1DatabaseName ?? d1DatabaseName();
if (!state.d1DatabaseId) {
  throw new Error(`Missing D1 database_id in ${displayPath(statePath)}. Run provision first.`);
}
patchWranglerBindings({ databaseId: state.d1DatabaseId, d1Name: dbName });

state.siteId = await resolveOAuthTrialSiteId(state, dbName, console.log);
if (!state.apiUrl) {
  state.apiUrl = await probeWorkersDevUrl(apiWorkerName());
}
saveState(state);

patchPublicSiteId(state.siteId);
if (isTrialNoR2()) ensureTrialInlineWranglerVars({ log: console.log });

try {
  run("npm", ["run", "build"]);
  run("npm", ["run", "build:admin-web"]);

  console.log("Applying D1 migrations (remote)…");
  applyD1MigrationsRemote({ databaseName: dbName, log: console.log });

  console.log("Pushing Worker secrets (trial API + public)…");
  pushApiSecrets();
  pushPublicSecrets();

  console.log(`Deploying ${apiWorkerName()}…`);
  let apiOut = wrangler(wranglerDeployApiArgs(), { silent: true });
  state.apiUrl = extractWorkerUrl(apiOut, apiWorkerName()) ?? state.apiUrl;

  console.log(`Deploying ${publicWorkerName()}…`);
  let pubOut = wrangler(wranglerDeployPublicArgs(), { silent: true });
  state.publicUrl = extractWorkerUrl(pubOut, publicWorkerName()) ?? state.publicUrl;

  if (state.apiUrl && state.publicUrl) {
    patchWranglerApiUrls(state.apiUrl, state.publicUrl);
    console.log("Redeploying with synced PUBLIC_BASE_URL / PREVIEW_BASE_URL…");
    apiOut = wrangler(wranglerDeployApiArgs(), { silent: true });
    pubOut = wrangler(wranglerDeployPublicArgs(), { silent: true });
    state.apiUrl = extractWorkerUrl(apiOut, apiWorkerName()) ?? state.apiUrl;
    state.publicUrl = extractWorkerUrl(pubOut, publicWorkerName()) ?? state.publicUrl;
  }

  saveState(state);

  const capUrl = `${(state.apiUrl ?? "").replace(/\/$/, "")}/v1/console/capabilities`;
  if (state.apiUrl) {
    const cap = await fetch(capUrl);
    const body = await cap.json().catch(() => ({}));
    console.log("\nCapabilities:", JSON.stringify(body, null, 2));
  }

  console.log(`
=== OAuth trial workers refreshed ===
API:    ${state.apiUrl ?? "(unknown)"}/console/
Public: ${state.publicUrl ?? "(unknown)"}
State:  ${displayPath(statePath)}
`);
} finally {
  resetWranglerConfigsToTemplate({ trialStripR2: true });
}
