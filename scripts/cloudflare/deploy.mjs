#!/usr/bin/env node
/**
 * baserEdge single-flow Cloudflare deploy (build → migrate → workers).
 * Usage:
 *   npm run provision:cloudflare   # once per account
 *   npm run deploy:cloudflare      # build + migrate + deploy
 *   npm run deploy:cloudflare -- --bootstrap   # also POST /v1/bootstrap (needs BASER_ALLOW_BOOTSTRAP on worker)
 */
import {
  ensureLoggedIn,
  loadState,
  saveState,
  patchWranglerBindings,
  patchPublicSiteId,
  run,
  wrangler,
  randomSecret,
  statePath,
  displayPath,
} from "./shared.mjs";
import { extractWorkerUrl } from "./wrangler-vars.mjs";
import {
  apiWorkerName,
  publicWorkerName,
  wranglerDeployApiArgs,
  wranglerDeployPublicArgs,
  requireProveConsent,
  d1DatabaseName,
} from "./stack.mjs";
import { applyD1MigrationsRemote } from "./apply-d1-migrations.mjs";

const args = new Set(process.argv.slice(2));
const doBootstrap = args.has("--bootstrap");
const doProvision = args.has("--provision");

requireProveConsent("deploy:cloudflare");
ensureLoggedIn();

if (doProvision || !loadState()?.d1DatabaseId) {
  run("node", ["scripts/cloudflare/provision.mjs"]);
}

let state = loadState();
if (!state?.d1DatabaseId) {
  throw new Error(`Missing D1 id. Run: npm run provision:cloudflare (writes ${displayPath(statePath)})`);
}
patchWranglerBindings({ databaseId: state.d1DatabaseId });
if (state.siteId) patchPublicSiteId(state.siteId);

console.log("Building packages and admin console…");
run("npm", ["run", "build"]);
run("npm", ["run", "build:admin-web"]);

console.log("Applying D1 migrations (remote, per-statement)…");
applyD1MigrationsRemote({ databaseName: state.d1DatabaseName ?? d1DatabaseName() });

console.log("Deploying API worker (includes /console static assets)…");
const apiDeploy = wrangler(wranglerDeployApiArgs(), { silent: true });
const apiUrl = extractWorkerUrl(apiDeploy, apiWorkerName());
state.apiUrl = apiUrl ?? state.apiUrl;

console.log("Deploying public renderer worker…");
const publicDeploy = wrangler(wranglerDeployPublicArgs(), { silent: true });
const publicUrl = extractWorkerUrl(publicDeploy, publicWorkerName());
state.publicUrl = publicUrl ?? state.publicUrl;

saveState(state);

if (doBootstrap && !state.bootstrapped) {
  await bootstrapSite(state);
  state.bootstrapped = true;
  saveState(state);
}

printPostDeploy(state);

async function bootstrapSite(state) {
  const apiUrl = state.apiUrl;
  if (!apiUrl) throw new Error("apiUrl unknown; bootstrap manually via POST /v1/bootstrap");
  const base = apiUrl.replace(/\/$/, "");
  console.log("Bootstrapping workspace/site via POST /v1/bootstrap …");
  const res = await fetch(`${base}/v1/bootstrap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceName: "baserEdge",
      siteName: "サイト",
      hostname: "www.example.com",
      ownerName: "Owner",
      locale: "ja-JP",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Bootstrap failed (${res.status}): ${JSON.stringify(body)}`);
  }
  const siteId = body.siteId ?? body.site?.id;
  if (siteId) {
    state.siteId = siteId;
    patchPublicSiteId(siteId);
    wrangler(wranglerDeployPublicArgs());
  }
  console.log("Bootstrap OK. Register Passkey at /console/login (set BASER_AUTH_* for production WebAuthn).");
}

function printPostDeploy(state) {
  console.log("\n--- baserEdge deploy complete ---\n");
  console.log("管理コンソール:", state.apiUrl ? `${state.apiUrl.replace(/\/$/, "")}/console/` : "(see wrangler deploy output)");
  console.log("公開ワーカー:", state.publicUrl ?? "(see wrangler deploy output)");
  console.log("D1 database_id:", state.d1DatabaseId);
  if (!state.bootstrapped) {
    console.log("\n初回のみ:");
    console.log("  推奨: npm run prove:cloudflare で自動実証");
  }
  console.log("\n開発用ローカル:", "npm run dev:stack → http://localhost:8787/console/");
  console.log("推奨シークレット例 (生成):", randomSecret());
}
