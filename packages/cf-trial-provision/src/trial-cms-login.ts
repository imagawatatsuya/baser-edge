import type { TrialReleaseConfig } from "./run-trial-provision-release.js";

export function assertTrialHostCmsOAuth(config: TrialReleaseConfig): void {
  const id = config.cmsOAuth?.clientId?.trim();
  const secret = config.cmsOAuth?.clientSecret?.trim();
  const redirectUri = config.cmsOAuth?.redirectUri?.trim();
  if (!id || !secret) {
    throw new Error(
      "お試し開設ホストに CMS 用 OAuth が未設定です。ホスト運用者が BASER_CF_OAUTH_* を設定してください。",
    );
  }
  if (!redirectUri) {
    throw new Error(
      "お試し開設ホストの CMS OAuth コールバック URL が未設定です（/api/cms-oauth/callback）。",
    );
  }
}

export async function verifyTrialCmsLoginReady(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const base = apiUrl.replace(/\/$/, "");
  const res = await fetchImpl(`${base}/v1/auth/cloudflare/entry`);
  if (!res.ok) {
    throw new Error(`管理画面ログインの確認に失敗しました (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { available?: boolean; reason?: string; mode?: string };
  if (!body.available) {
    const reason = body.reason ?? "unknown";
    throw new Error(`管理画面の Cloudflare ログインが利用できません (${reason})`);
  }
  if (body.mode !== "oauth") {
    throw new Error(`管理画面ログインの方式が不正です (mode=${body.mode ?? "missing"})`);
  }
}
