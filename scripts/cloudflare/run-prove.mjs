import { run, wrangler, ensureLoggedIn, loadState, saveState, patchWranglerBindings, patchPublicSiteId, statePath, displayPath } from "./shared.mjs";
import { extractWorkerUrl, patchWranglerApiUrls, patchInstantLogin } from "./wrangler-vars.mjs";
import { pushApiSecrets, pushPublicSecrets } from "./push-secrets.mjs";
import { bootstrapRemote, smokeLoginAndPublish } from "./remote-demo.mjs";
import {
  apiWorkerName,
  publicWorkerName,
  wranglerDeployApiArgs,
  wranglerDeployPublicArgs,
  d1DatabaseName,
  isTrialNoR2,
} from "./stack.mjs";
import { runProvision } from "./run-provision.mjs";
import { applyD1MigrationsRemote } from "./apply-d1-migrations.mjs";
import { syncInstantLoginDeploy } from "./sync-instant-login.mjs";
import { upgradeTrialMediaStack } from "./upgrade-trial-media.mjs";

/**
 * @param {{ onProgress?: (event: { step: string, message?: string, consoleUrl?: string, publicUrl?: string }) => void, log?: (...args: unknown[]) => void, runSmoke?: boolean }} options
 */
export async function runProve(options = {}) {
  const onProgress = options.onProgress ?? (() => {});
  const log = options.log ?? console.log;
  const runSmoke = options.runSmoke !== false;

  if (options.trialNoR2) process.env.BASER_TRIAL_NO_R2 = "1";

  ensureLoggedIn();

  const trial = isTrialNoR2();
  onProgress({
    step: "provision",
    message: trial
      ? "Cloudflare 上にデータベースを準備しています（お試し: ファイル保存は後から有効化）…"
      : "Cloudflare 上にデータベースとストレージを準備しています…",
  });
  let state = loadState();
  let mediaUpgraded = false;
  if (!state?.d1DatabaseId) {
    state = await runProvision(log);
  } else {
    const upgrade = await upgradeTrialMediaStack({ log, state });
    state = upgrade.state;
    mediaUpgraded = upgrade.upgraded;
    if (mediaUpgraded) {
      onProgress({ step: "provision", message: "メディア配信（R2）を追加しています…" });
    }
  }
  if (!state?.d1DatabaseId) throw new Error(`Missing D1 id after provision (${displayPath(statePath)})`);

  patchWranglerBindings({ databaseId: state.d1DatabaseId });
  if (state.siteId) patchPublicSiteId(state.siteId);

  onProgress({ step: "build", message: "管理画面をビルドしています…" });
  log("Building…");
  run("npm", ["run", "build"]);
  run("npm", ["run", "build:admin-web"]);

  onProgress({ step: "migrate", message: "データベースを初期化しています…" });
  log("Applying D1 migrations (remote, per-statement)…");
  applyD1MigrationsRemote({ databaseName: state.d1DatabaseName ?? d1DatabaseName(), log });

  onProgress({ step: "secrets", message: "セキュリティ設定を適用しています…" });
  log("Pushing Worker secrets…");
  pushApiSecrets();

  onProgress({ step: "deploy", message: "サイトを公開しています…" });
  log("Deploying API worker (initial)…");
  let apiOut = wrangler(wranglerDeployApiArgs(), { silent: true });
  state.apiUrl = extractWorkerUrl(apiOut, apiWorkerName()) ?? state.apiUrl;

  log("Deploying public worker (initial)…");
  let pubOut = wrangler(wranglerDeployPublicArgs(), { silent: true });
  state.publicUrl = extractWorkerUrl(pubOut, publicWorkerName()) ?? state.publicUrl;

  if (!state.apiUrl || !state.publicUrl) throw new Error("Could not detect worker URLs from wrangler deploy output");

  patchWranglerApiUrls(state.apiUrl, state.publicUrl);
  pushPublicSecrets();

  log("Redeploying with synced URLs and secrets…");
  apiOut = wrangler(wranglerDeployApiArgs(), { silent: true });
  pubOut = wrangler(wranglerDeployPublicArgs(), { silent: true });
  state.apiUrl = extractWorkerUrl(apiOut, apiWorkerName()) ?? state.apiUrl;
  state.publicUrl = extractWorkerUrl(pubOut, publicWorkerName()) ?? state.publicUrl;

  onProgress({ step: "bootstrap", message: "サイトを開設しています…" });
  let boot = state.demoHint ?? null;
  if (!state.demoHint) {
    let bootResult = null;
    if (!state.bootstrapped) {
      bootResult = await bootstrapRemote(state.apiUrl);
    }
    if (bootResult) {
      state.bootstrap = {
        workspaceId: bootResult.workspaceId,
        siteId: bootResult.siteId,
        ownerPrincipalId: bootResult.ownerPrincipalId,
      };
      state.bootstrapped = true;
      state.siteId = bootResult.siteId;
      patchPublicSiteId(bootResult.siteId);
      wrangler(wranglerDeployPublicArgs(), { silent: true });
      saveState(state);
    } else if (!state.bootstrap) {
      throw workspaceExistsHelp(state);
    }
    const bootstrapPayload = state.bootstrap;
    const siteId = state.siteId ?? bootstrapPayload.siteId;
    if (siteId && siteId !== state.siteId) {
      state.siteId = siteId;
      patchPublicSiteId(siteId);
      wrangler(wranglerDeployPublicArgs(), { silent: true });
    }
    const ownerHint = {
      workspaceId: bootstrapPayload.workspaceId,
      ownerPrincipalId: bootstrapPayload.ownerPrincipalId,
      siteId: bootstrapPayload.siteId,
      siteName: "マイサイト",
      publicUrl: state.publicUrl.replace(/\/$/, ""),
    };
    patchInstantLogin(ownerHint);
    wrangler(wranglerDeployApiArgs(), { silent: true });
    boot = buildDemoContext(bootstrapPayload, state.apiUrl, state.publicUrl);
    state.demoHint = boot;
    state.bootstrapped = true;
    saveState(state);
  }

  saveState(state);

  const consoleUrl = `${state.apiUrl.replace(/\/$/, "")}/console/`;
  onProgress({ step: "verify", message: "管理画面を確認しています…", consoleUrl });

  if (boot) {
    syncInstantLoginDeploy(state, boot, log);
  }

  const health = await fetch(`${state.apiUrl.replace(/\/$/, "")}/health`);
  if (!health.ok) throw new Error(`/health ${health.status}`);
  const consoleRes = await fetch(consoleUrl);
  if (!consoleRes.ok) throw new Error(`/console/ ${consoleRes.status}`);

  let published = null;
  if (runSmoke && boot) {
    onProgress({ step: "smoke", message: "公開ページを確認しています…" });
    published = await smokeLoginAndPublish(boot, state.publicUrl);
  }

  onProgress({
    step: "succeeded",
    message: "完了しました",
    consoleUrl,
    publicUrl: published?.publicUrl ?? state.publicUrl,
  });

  return { state, consoleUrl, published, mediaUpgraded };
}

function buildDemoContext(bootstrap, apiUrl, publicUrl) {
  const base = apiUrl.replace(/\/$/, "");
  return {
    workspaceId: bootstrap.workspaceId,
    siteId: bootstrap.siteId,
    ownerPrincipalId: bootstrap.ownerPrincipalId,
    siteName: "マイサイト",
    publicUrl: publicUrl.replace(/\/$/, ""),
    apiUrl: base,
    instantDemo: true,
  };
}

function workspaceExistsHelp(state) {
  const db = state.d1DatabaseName ?? "baser-edge";
  return new Error(
    [
      "Workspace already exists on D1 but this stack has no demo context.",
      `Reset remote D1 (${db}) or use a new BASER_CF_STACK id.`,
    ].join(" "),
  );
}
