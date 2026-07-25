#!/usr/bin/env node
/**
 * Workers Builds / Deploy ボタンの deploy フェーズ。
 * 利用者の Cloudflare アカウント上で prove 相当を実行（スタック trial）。
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadState } from "../../scripts/cloudflare/shared.mjs";
import { resolveProveMediaStorage } from "../../scripts/cloudflare/resolve-prove-media.mjs";
import { runProve } from "../../scripts/cloudflare/run-prove.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
process.chdir(root);

process.env.BASER_CF_PROVE = "1";
if (!process.env.BASER_CF_STACK?.trim()) {
  process.env.BASER_CF_STACK = "trial";
}

const media = resolveProveMediaStorage({ log: console.log, state: loadState() });

const { consoleUrl, state } = await runProve({
  runSmoke: false,
  log: console.log,
});

console.log("\n=== baserEdge お試しデプロイ完了 ===\n");
console.log("管理画面（ブラウザで開く）:");
console.log(consoleUrl);
console.log("\n→ 「管理をはじめる」を1回押してください。");
if (state.publicUrl) console.log("公開サイト:", state.publicUrl);
if (!media.mediaPublicDelivery) {
  console.log("\n(メディアの公開 URL: このデプロイでは無効 — 管理画面の注意バナーを参照)");
} else {
  console.log("\n(メディア配信: R2 あり)");
}
