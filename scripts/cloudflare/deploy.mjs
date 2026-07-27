#!/usr/bin/env node
/**
 * baserEdge maintainer deploy (build → migrate → workers).
 * End users should open a site via trial onboarding — see docs/deployment/provisioning-paths.md
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
  isTrialNoR2,
} from "./stack.mjs";
import { applyD1MigrationsRemote } from "./apply-d1-migrations.mjs";
import { getBootstrapSecret } from "./secrets-store.mjs";
import { TRIAL_ONBOARDING_START_URL } from "./trial-start-url.mjs";
import { resetWranglerConfigsToTemplate } from "./wrangler-template-reset.mjs";
import { ensureTrialInlineWranglerVars } from "./ensure-trial-inline-wrangler.mjs";

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
if (isTrialNoR2()) ensureTrialInlineWranglerVars({ log: console.log });

try {
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
} finally {
  resetWranglerConfigsToTemplate({ trialStripR2: true });
  console.log("(ローカル wrangler*.jsonc をテンプレに戻しました。)");
}

async function bootstrapSite(state) {
  const apiUrl = state.apiUrl;
  if (!apiUrl) throw new Error("apiUrl unknown; bootstrap manually via POST /v1/bootstrap");
  const base = apiUrl.replace(/\/$/, "");
  console.log("Bootstrapping workspace/site via POST /v1/bootstrap …");
  const bootstrapSecret = getBootstrapSecret();
  const res = await fetch(`${base}/v1/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bootstrapSecret ? { "x-baser-bootstrap-secret": bootstrapSecret } : {}),
    },
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
  console.log("\n--- baserEdge deploy complete (開発者向け手動デプロイ) ---\n");
  console.log("一般のサイト開設:", TRIAL_ONBOARDING_START_URL);
  console.log("  → 利用者はブラウザだけ。OAuth/Access/binding は開設処理が自動で行います。");
  console.log("  → 詳細:", "docs/deployment/provisioning-paths.md");
  console.log("");
  console.log("管理コンソール:", state.apiUrl ? `${state.apiUrl.replace(/\/$/, "")}/console/` : "(see wrangler deploy output)");
  console.log("公開ワーカー:", state.publicUrl ?? "(see wrangler deploy output)");
  console.log("D1 database_id:", state.d1DatabaseId);
  if (!state.bootstrapped) {
    console.log("\n初回のみ (メンテナ): npm run prove:cloudflare または npm run bind:cloudflare-owner + OAuth シークレット");
  }
  console.log("\n開発用ローカル:", "npm run dev:stack → 起動ログの管理画面 URL（/console/）");
}
