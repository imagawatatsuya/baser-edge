/**
 * @see scripts/onboarding/cf-oauth-scopes.mjs — keep defaults in sync.
 */
export const DEFAULT_BASER_CF_OAUTH_SCOPES =
  "user-details.read memberships.read account-settings.read workers-scripts.write d1.write";

const LEGACY_INVALID_SCOPE = /\b(?:account_settings|workers_scripts)\./;
const LEGACY_FAKE_OAUTH_SCOPE = /\b(?:user\.read|account\.read)\b/;

export function resolveBaserCfOAuthScopes(override?: string): string {
  const raw = override?.trim();
  return raw || DEFAULT_BASER_CF_OAUTH_SCOPES;
}

export function validateOAuthScopeShape(scopes: string): string | null {
  const s = scopes.trim();
  if (!s) return "BASER_CF_OAUTH_SCOPES が空です";
  if (LEGACY_INVALID_SCOPE.test(s)) {
    return "OAuth scope はハイフン区切りです（account-settings.read workers-scripts.write）";
  }
  if (LEGACY_FAKE_OAUTH_SCOPE.test(s)) {
    return "user.read / account.read は OAuth scope として存在しません。user-details.read と memberships.read を使ってください";
  }
  return null;
}
