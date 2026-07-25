/**
 * GitHub Actions から runProve を実行し、Worker へ進捗を POST する。
 */
import { decryptOnboardingSecret } from "./crypto-token.mjs";
import { runProve } from "../cloudflare/run-prove.mjs";

const sessionId = process.env.ONBOARDING_SESSION_ID?.trim();
const stackId = process.env.BASER_CF_STACK?.trim();
const ciphertext = process.env.ONBOARDING_TOKEN_CIPHERTEXT?.trim();
const callbackUrl = process.env.ONBOARDING_CALLBACK_URL?.trim();
const callbackSecret = process.env.ONBOARDING_CALLBACK_SECRET?.trim();

if (!sessionId || !stackId || !ciphertext || !callbackUrl || !callbackSecret) {
  console.error("Missing ONBOARDING_* env for prove job");
  process.exit(1);
}

process.env.CLOUDFLARE_API_TOKEN = decryptOnboardingSecret(ciphertext);
process.env.BASER_CF_PROVE = "1";
process.env.BASER_TRIAL_NO_R2 = "1";

async function patchSession(body) {
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-onboarding-secret": callbackSecret,
    },
    body: JSON.stringify({ sessionId, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Callback failed ${res.status}: ${text}`);
  }
}

try {
  await patchSession({ status: "running", step: "connect", message: "Cloudflare に接続しました" });
  const result = await runProve({
    runSmoke: false,
    trialNoR2: true,
    log: console.log,
    onProgress: (event) => {
      void patchSession({
        status: event.step === "succeeded" ? "succeeded" : "running",
        step: event.step,
        message: event.message ?? "",
        consoleUrl: event.consoleUrl,
        publicUrl: event.publicUrl,
      }).catch((e) => console.error("progress callback", e));
    },
  });
  await patchSession({
    status: "succeeded",
    step: "succeeded",
    message: "サイトの準備ができました",
    consoleUrl: result.consoleUrl,
    publicUrl: result.state.publicUrl,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await patchSession({
    status: "failed",
    step: "failed",
    message: "開設に失敗しました",
    error: message,
  }).catch(() => {});
  console.error(message);
  process.exit(1);
}
