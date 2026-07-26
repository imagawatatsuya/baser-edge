import { fetchCloudflareUserEmail } from "@baser-edge/auth-kernel";

export async function fetchTrialProvisionerIdentity(
  apiToken: string,
  accountId: string,
): Promise<{ accountId: string; ownerEmail: string }> {
  const ownerEmail = await fetchCloudflareUserEmail(apiToken);
  return { accountId: accountId.trim().toLowerCase(), ownerEmail };
}
