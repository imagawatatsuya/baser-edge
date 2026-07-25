#!/usr/bin/env node
/**
 * Workers Builds / Deploy ボタンの deploy フェーズ。
 * 利用者の Cloudflare アカウント上で prove 相当を実行（R2 なしお試し）。
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runProve } from "../../scripts/cloudflare/run-prove.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
process.chdir(root);

process.env.BASER_CF_PROVE = "1";
process.env.BASER_TRIAL_NO_R2 = "1";
if (!process.env.BASER_CF_STACK?.trim()) {
  process.env.BASER_CF_STACK = "trial";
}

const { consoleUrl, state } = await runProve({
  runSmoke: false,
  trialNoR2: true,
  log: console.log,
});

console.log("\n=== baserEdge お試しデプロイ完了 ===\n");
console.log("管理画面（ブラウザで開く）:");
console.log(consoleUrl);
console.log("\n→ 「管理をはじめる」を1回押してください。");
if (state.publicUrl) console.log("公開サイト:", state.publicUrl);
