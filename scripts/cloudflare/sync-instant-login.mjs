import { wrangler } from "./shared.mjs";
import { patchInstantLogin } from "./wrangler-vars.mjs";
import { wranglerDeployApiArgs } from "./stack.mjs";

export function syncInstantLoginDeploy(state, boot, log = console.log) {
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
}
