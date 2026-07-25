/** 不特定多数向けホスト型お試し（利用者はリポジトリ運営者に関与しない） */
export function publicTrialMode() {
  const v = process.env.BASER_ONBOARDING_PUBLIC?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return process.env.NODE_ENV === "production";
}

export function trialServiceReady(oauthEnabled) {
  if (!publicTrialMode()) return true;
  return oauthEnabled;
}
