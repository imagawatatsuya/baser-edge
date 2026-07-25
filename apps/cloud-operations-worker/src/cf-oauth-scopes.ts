/** @see apps/onboarding-worker/src/cf-oauth-scopes.ts */
export const DEFAULT_BASER_CF_OAUTH_SCOPES =
  "account-settings.read workers-scripts.write d1.write";

const LEGACY_INVALID_SCOPE = /\b(?:account_settings|workers_scripts)\./;

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
  return null;
}
