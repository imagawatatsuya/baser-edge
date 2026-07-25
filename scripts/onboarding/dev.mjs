#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { oauthConfigured } from "./cf-oauth.mjs";
import { publicTrialMode } from "./onboarding-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));

function run(cmd, args, label) {
  const child = spawn(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  child.on("exit", (code) => {
    if (code !== 0) console.error(`${label} exited`, code);
  });
  return child;
}

const api = run(process.execPath, ["scripts/onboarding/server.mjs"], "onboarding-api");
const web = run("npm", ["run", "dev", "-w", "@baser-edge/onboarding-web"], "onboarding-web");

function shutdown() {
  api.kill();
  web.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("\n→ http://localhost:5174/start/\n");
if (publicTrialMode()) {
  console.log("BASER_ONBOARDING_PUBLIC が有効です。OAuth 必須（利用者向け本番と同じ挙動）。");
} else {
  console.log("ローカル開発: 手動トークン可。本番同等は BASER_ONBOARDING_PUBLIC=1 + OAuth。");
}
if (!oauthConfigured()) {
  console.log("OAuth 未設定 → BASER_CF_OAUTH_CLIENT_ID / BASER_CF_OAUTH_CLIENT_SECRET を設定するとログイン開設が使えます。");
  console.log("  docs/deployment/cloudflare-oauth-onboarding.md");
}
