const CF_API = "https://api.cloudflare.com/client/v4";

export async function verifyCloudflareApiToken(token) {
  const res = await fetch(`${CF_API}/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.errors?.[0]?.message ?? "API トークンの検証に失敗しました");
  }
  return body.result;
}

export async function listAccounts(token) {
  const res = await fetch(`${CF_API}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.errors?.[0]?.message ?? "アカウント一覧の取得に失敗しました");
  }
  const accounts = body.result ?? [];
  if (!accounts.length) throw new Error("このトークンで利用できる Cloudflare アカウントがありません");
  return accounts;
}

/** Cloudflare dashboard: user creates token with guided permissions */
export const CREATE_TOKEN_URL = "https://dash.cloudflare.com/profile/api-tokens";

export const TOKEN_PERMISSIONS_HELP = [
  "Account — Workers Scripts: Edit",
  "Account — D1: Edit",
  "Account — Account Settings: Read",
].join("\n");
