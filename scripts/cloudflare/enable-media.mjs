#!/usr/bin/env node
/**
 * Upgrade an existing trial-no-R2 stack: create R2 bucket, patch wrangler trial configs, redeploy.
 * Requires Cloudflare R2 subscription (billing payment method on file).
 */
import { ensureLoggedIn, loadState, run, wrangler, statePath, displayPath } from "./shared.mjs";
import { isR2Available } from "./r2-available.mjs";
import { syncInstantLoginDeploy } from "./sync-instant-login.mjs";
import { wranglerDeployApiArgs, wranglerDeployPublicArgs, requireProveConsent } from "./stack.mjs";
import { upgradeTrialMediaStack } from "./upgrade-trial-media.mjs";

requireProveConsent("enable-media:cloudflare");
ensureLoggedIn();

let state = loadState();
if (!state?.d1DatabaseId) {
  throw new Error(`No Cloudflare state (${displayPath(statePath)}). Run prove:cloudflare first.`);
}

if (!isR2Available()) {
  console.error(`
R2 API にアクセスできません。請求プロファイルへの支払い方法登録だけでは不十分なことがあります。

支払い手段の例: Visa / Mastercard / Amex / Discover / UnionPay、PayPal、Apple Pay、Google Pay、Link
（docs/deployment/cloudflare-r2-and-media.md）

1. ダッシュボード → Storage & databases → R2 → Overview
2. R2 サブスクリプション（チェックアウト）を完了
   https://developers.cloudflare.com/r2/get-started/

完了後に再度: npm run enable-media:cloudflare
または Deploy / prove を再実行してください。
`);
  process.exit(1);
}

const { upgraded, state: nextState } = await upgradeTrialMediaStack({ log: console.log, state });
state = nextState;

if (!upgraded) {
  console.log("このスタックはすでに R2 込みです。再デプロイのみ行います。");
}

console.log("Building…");
run("npm", ["run", "build"]);
run("npm", ["run", "build:admin-web"]);

console.log("Redeploying API + public workers (R2 binding)…");
wrangler(wranglerDeployApiArgs(), { silent: true });
wrangler(wranglerDeployPublicArgs(), { silent: true });

if (state.demoHint || state.bootstrap) {
  syncInstantLoginDeploy(state, state.demoHint ?? state.bootstrap, console.log);
}

console.log(`
=== メディア配信を有効化しました ===

公開サイトの /assets/… で画像を配信できます。
お試しデプロイ中にアップロードした画像は R2 に実体がないため、**再アップロード**してください。

管理コンソール: ${state.apiUrl?.replace(/\/$/, "")}/console/
`);
