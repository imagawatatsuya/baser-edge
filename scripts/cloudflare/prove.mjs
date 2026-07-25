#!/usr/bin/env node
/**
 * End-to-end Cloudflare proof (CLI).
 *   BASER_CF_PROVE=1 npm run prove:cloudflare
 * 既定はお試し（R2 なし・wrangler.trial.jsonc）。R2 込み: BASER_CF_FULL_STACK=1
 */
import { ensureLoggedIn } from "./shared.mjs";
import { requireProveConsent, isTrialNoR2 } from "./stack.mjs";
import { runProve } from "./run-prove.mjs";
import { statePath } from "./shared.mjs";

requireProveConsent();
ensureLoggedIn();

const { consoleUrl, published, state } = await runProve({ log: console.log });

console.log("\n=== baserEdge Cloudflare proof OK ===\n");
console.log("管理コンソール:", consoleUrl);
console.log("→ 「管理をはじめる」でログイン");
if (published) console.log("公開ページ:", published.publicUrl);
console.log("状態ファイル:", statePath);
console.log("(BASER_ENV=preview + instant login — 実証専用)");
if (isTrialNoR2() || state.trialNoR2) {
  console.log("(お試し: R2 なし。メディア永続化が必要なら BASER_CF_FULL_STACK=1 で再デプロイ)");
}
