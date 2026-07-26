import { fetchCloudflareUserEmail } from "@baser-edge/auth-kernel";

export async function fetchTrialProvisionerIdentity(
  apiToken: string,
  accountId: string,
): Promise<{ accountId: string; ownerEmail: string }> {
  try {
    const ownerEmail = await fetchCloudflareUserEmail(apiToken);
    return { accountId: accountId.trim().toLowerCase(), ownerEmail };
  } catch {
    throw new Error(
      "Cloudflare のメールアドレスを取得できません。お試し開設用 OAuth に User Details Read（user-details.read）が含まれているか、ホストの BASER_CF_OAUTH_SCOPES を確認してください。",
    );
  }
}
