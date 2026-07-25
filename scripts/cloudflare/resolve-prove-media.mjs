import { isR2Available } from "./r2-available.mjs";
import { ensureWranglerR2Bindings } from "./ensure-wrangler-r2.mjs";

/**
 * Decide R2 / media for this prove run.
 * - BASER_CF_FULL_STACK=1 → full wrangler.jsonc (unchanged)
 * - BASER_CF_TRIAL=1 or BASER_TRIAL_NO_R2=1 → no R2
 * - else if R2 API works → trial wrangler + R2 bindings (media on)
 * - else → trial without R2
 */
export function resolveProveMediaStorage({ log = console.log, state } = {}) {
  if (process.env.BASER_CF_FULL_STACK === "1" || process.env.BASER_CF_FULL_STACK === "true") {
    return { mediaPublicDelivery: true, profile: "full_stack" };
  }
  if (
    process.env.BASER_CF_TRIAL === "1"
    || process.env.BASER_CF_TRIAL === "true"
    || process.env.BASER_TRIAL_NO_R2 === "1"
  ) {
    return { mediaPublicDelivery: false, profile: "trial_no_r2" };
  }
  if (state?.trialNoR2 === false) {
    process.env.BASER_TRIAL_NO_R2 = "0";
    ensureWranglerR2Bindings({ log });
    return { mediaPublicDelivery: true, profile: "trial_with_r2" };
  }
  if (isR2Available()) {
    log("");
    log("Cloudflare R2 が利用可能です → メディア配信込みでデプロイします（お試しログイン構成のまま R2 を追加）。");
    log("メディアなしのお試しのみ必要な場合: BASER_CF_TRIAL=1 を付けて再実行してください。");
    log("");
    process.env.BASER_TRIAL_NO_R2 = "0";
    ensureWranglerR2Bindings({ log });
    return { mediaPublicDelivery: true, profile: "trial_with_r2" };
  }
  log("");
  log("R2 がまだ有効化されていません → お試しモード（ページは可、公開メディア URL は不可）でデプロイします。");
  log("請求プロファイル（Visa/Mastercard/Amex/Discover/UnionPay、PayPal、Apple Pay、Google Pay、Link 等）と R2 チェックアウトは別です。docs/deployment/cloudflare-r2-and-media.md");
  log("ダッシュボードで R2 サブスクリプションを完了後:");
  log("  npm run enable-media:cloudflare   … 既存スタックに R2 を追加");
  log("  または Deploy / prove を再実行（R2 有効化後は自動でメディア追加）");
  log("");
  return { mediaPublicDelivery: false, profile: "trial_no_r2" };
}
