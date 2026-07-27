import { wrangler } from "./shared.mjs";
import { patchInstantLogin } from "./wrangler-vars.mjs";
import { wranglerDeployApiArgs } from "./stack.mjs";
import { waitForInstantLogin } from "./wait-instant-login.mjs";
import { cmsOAuthSecretsConfigured } from "./secrets-store.mjs";

export async function syncInstantLoginDeploy(state, boot, log = console.log) {
  if (cmsOAuthSecretsConfigured()) {
    log("CMS OAuth secrets are configured; instant login stays disabled on the worker.");
    return;
  }
  const payload = boot ?? state.demoHint ?? state.bootstrap;
  if (!payload?.workspaceId) return;
  const ownerHint = {
    workspaceId: payload.workspaceId,
    ownerPrincipalId: payload.ownerPrincipalId,
    siteId: payload.siteId,
    siteName: payload.siteName ?? "マイサイト",
    publicUrl: (payload.publicUrl ?? state.publicUrl ?? "").replace(/\/$/, ""),
  };
  patchInstantLogin(ownerHint);
  log("Redeploying API worker (instant login)…");
  wrangler(wranglerDeployApiArgs(), { silent: true });
  const apiUrl = state.apiUrl ?? payload.apiUrl;
  if (apiUrl) {
    const ready = await waitForInstantLogin(apiUrl, { log });
    if (!ready) {
      log("Warning: instant login still returns 404 after redeploy; publish smoke may be skipped.");
    }
  }
}
