/**
 * GitHub Actions: お試しスタック削除 → Worker へ結果通知（任意）。
 */
import { decryptOnboardingSecret } from "./crypto-token.mjs";
import { runDestroy } from "../cloudflare/run-destroy.mjs";

const stackId = process.env.BASER_CF_STACK?.trim();
const ciphertext = process.env.ONBOARDING_TOKEN_CIPHERTEXT?.trim();

if (!stackId || !ciphertext) {
  console.error("Missing BASER_CF_STACK or ONBOARDING_TOKEN_CIPHERTEXT");
  process.exit(1);
}

process.env.CLOUDFLARE_API_TOKEN = decryptOnboardingSecret(ciphertext);
process.env.BASER_CF_DESTROY = "1";
process.env.BASER_TRIAL_NO_R2 = "1";

try {
  const { anyRemoved } = await runDestroy({ log: console.log });
  if (!anyRemoved) {
    console.error("Nothing removed");
    process.exit(1);
  }
  console.log("Destroy ok for", stackId);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
