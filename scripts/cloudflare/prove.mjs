#!/usr/bin/env node
/**
 * End-to-end Cloudflare proof (CLI).
 *   BASER_CF_PROVE=1 npm run prove:cloudflare
 * 既定はお試し（R2 なし・wrangler.trial.jsonc）。R2 込み: BASER_CF_FULL_STACK=1
 */
import { ensureLoggedIn } from "./shared.mjs";
import { requireProveConsent, isTrialNoR2 } from "./stack.mjs";
import { resolveProveMediaStorage } from "./resolve-prove-media.mjs";
import { loadState } from "./shared.mjs";
import { runProve } from "./run-prove.mjs";
import { statePath, displayPath } from "./shared.mjs";

requireProveConsent();
ensureLoggedIn();

const media = resolveProveMediaStorage({ log: console.log, state: loadState() });

const { consoleUrl, published, state } = await runProve({ log: console.log });

console.log("\n=== baserEdge Cloudflare proof OK ===\n");
console.log("管理コンソール:", consoleUrl);
console.log("→ 「管理をはじめる」でログイン");
if (published) console.log("公開ページ:", published.publicUrl);
console.log("状態ファイル:", displayPath(statePath));
console.log("(BASER_ENV=preview + instant login — 実証専用)");
if (!media.mediaPublicDelivery) {
  console.log("(メディアの公開 URL なし — R2 未契約または BASER_CF_TRIAL=1。R2 有効化後は Deploy / prove の再実行で自動追加)");
} else if (media.profile === "trial_with_r2") {
  console.log("(メディア配信: R2 あり・お試しログイン構成)");
} else if (isTrialNoR2() || state.trialNoR2) {
  console.log("(お試し: R2 なし。メディア永続化が必要なら BASER_CF_FULL_STACK=1 で再デプロイ)");
}
