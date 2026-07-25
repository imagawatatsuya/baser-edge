import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
export { root };

/** お試し開設（既定）: R2 を作らず trial 用 wrangler でデプロイ。フルスタックは BASER_CF_FULL_STACK=1 */
export function isTrialNoR2() {
  if (process.env.BASER_CF_FULL_STACK === "1" || process.env.BASER_CF_FULL_STACK === "true") {
    return false;
  }
  if (process.env.BASER_TRIAL_NO_R2 === "0" || process.env.BASER_TRIAL_NO_R2 === "false") {
    return false;
  }
  return true;
}

export function wranglerApiConfigRel() {
  return isTrialNoR2() ? "wrangler.trial.jsonc" : "wrangler.jsonc";
}

export function wranglerPublicConfigRel() {
  return isTrialNoR2() ? "wrangler.public.trial.jsonc" : "wrangler.public.jsonc";
}

/**
 * Isolate baserEdge proof resources on Cloudflare.
 *
 *   BASER_CF_STACK=lab   → workers baser-edge-api-lab, D1 baser-edge-lab, R2 baser-edge-assets-lab
 *   (unset or "default") → legacy names baser-edge-api, baser-edge, baser-edge-assets
 */
export function cfStackId() {
  const raw = (process.env.BASER_CF_STACK ?? "default").trim();
  if (!raw || raw === "default") return "default";
  if (!/^[a-z0-9][a-z0-9-]{0,30}$/i.test(raw)) {
    throw new Error(`Invalid BASER_CF_STACK "${raw}" (use 1–31 chars: letters, digits, hyphen)`);
  }
  return raw.toLowerCase();
}

/** 一時的に BASER_CF_STACK を差し替えて名前解決などを行う */
export function runWithStackId(stackId, fn) {
  const prev = process.env.BASER_CF_STACK;
  process.env.BASER_CF_STACK = stackId;
  try {
    return fn();
  } finally {
    if (prev !== undefined) process.env.BASER_CF_STACK = prev;
    else delete process.env.BASER_CF_STACK;
  }
}

function suffix() {
  const id = cfStackId();
  return id === "default" ? "" : `-${id}`;
}

export function apiWorkerName() {
  return `baser-edge-api${suffix()}`;
}

export function publicWorkerName() {
  return `baser-edge-public${suffix()}`;
}

export function d1DatabaseName() {
  const id = cfStackId();
  return id === "default" ? "baser-edge" : `baser-edge-${id}`;
}

export function r2BucketName() {
  const id = cfStackId();
  return id === "default" ? "baser-edge-assets" : `baser-edge-assets-${id}`;
}

export function resolveStatePath() {
  const id = cfStackId();
  if (id === "default") return join(root, "deploy", "cloudflare-state.json");
  return join(root, "deploy", `cloudflare-state.${id}.json`);
}

export function describeStack() {
  const id = cfStackId();
  return {
    stackId: id,
    stateFile: resolveStatePath(),
    apiWorker: apiWorkerName(),
    publicWorker: publicWorkerName(),
    d1: d1DatabaseName(),
    r2: r2BucketName(),
  };
}

export function printStackPlan() {
  const s = describeStack();
  console.log("--- baserEdge Cloudflare stack (plan) ---\n");
  console.log("スタック ID:", s.stackId === "default" ? "(default)" : s.stackId);
  console.log("状態ファイル:", s.stateFile);
  console.log("\n作成または更新されるリソースの例:");
  console.log("  Worker (API):   ", s.apiWorker);
  console.log("  Worker (公開):  ", s.publicWorker);
  console.log("  D1:             ", s.d1);
  if (!isTrialNoR2()) {
    console.log("  R2 bucket:      ", s.r2);
  } else {
    console.log("  R2 bucket:      (お試し: 作成しません — BASER_TRIAL_NO_R2)");
  }
  console.log("  Worker secrets: ASSET_UPLOAD_SECRET, PREVIEW_SECRET, … (このスタックの Worker にのみ)");
  console.log("\n触らないもの:");
  console.log("  他アカウントのゾーン/DNS、既存の無関係 Worker、BASER_CF_STACK 以外の baserEdge リソース");
  console.log("\nローカルだけなら Cloudflare 不要: npm run prove:local");
}

export function hasProveConsent() {
  return process.env.BASER_CF_PROVE === "1" || process.argv.includes("--yes");
}

export function requireProveConsent(scriptName = "prove:cloudflare") {
  if (hasProveConsent()) return;
  printStackPlan();
  console.log(`\n中止: Cloudflare には接続しません (${scriptName})。`);
  console.log("使い捨てスタック例（お試し・R2 なし）:");
  console.log("  BASER_CF_STACK=lab BASER_CF_PROVE=1 npm run prove:cloudflare");
  console.log("R2 込みのフルスタック:");
  console.log("  BASER_CF_FULL_STACK=1 BASER_CF_STACK=lab BASER_CF_PROVE=1 npm run prove:cloudflare");
  console.log("R2・メディア・請求（カード≠R2）: docs/deployment/cloudflare-r2-and-media.md");
  console.log("片付け:");
  console.log("  BASER_CF_STACK=lab BASER_CF_DESTROY=1 npm run destroy:cloudflare");
  process.exit(1);
}

export function requireDestroyConsent() {
  if (process.env.BASER_CF_DESTROY === "1" || process.argv.includes("--yes")) return;
  const s = describeStack();
  const statePath = resolveStatePath();
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;
  const skipR2 = state?.trialNoR2 !== false && (state?.trialNoR2 === true || isTrialNoR2());
  const r2Part = skipR2 ? "" : `, R2 ${s.r2}`;
  console.log(`破棄対象: ${s.apiWorker}, ${s.publicWorker}, D1 ${s.d1}${r2Part}`);
  console.log("\n中止。実行する場合:");
  console.log(`  BASER_CF_STACK=${s.stackId === "default" ? "default" : s.stackId} BASER_CF_DESTROY=1 npm run destroy:cloudflare`);
  process.exit(1);
}

export function wranglerDeployApiArgs(extra = []) {
  const args = ["deploy", "--name", apiWorkerName()];
  if (isTrialNoR2()) args.push("--config", wranglerApiConfigRel());
  return [...args, ...extra];
}

export function wranglerDeployPublicArgs(extra = []) {
  return ["deploy", "--config", wranglerPublicConfigRel(), "--name", publicWorkerName(), ...extra];
}
