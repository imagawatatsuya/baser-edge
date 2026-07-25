/**
 * Default OAuth scopes for trial prove / teardown.
 * IDs must match GET https://api.cloudflare.com/client/v4/oauth/scopes (`id` field).
 * API token permission UI uses spaces (e.g. "Workers Scripts Edit"); OAuth uses hyphens, not underscores.
 *
 * @see https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/
 * @see https://developers.cloudflare.com/api/resources/iam/subresources/oauth_scopes/methods/list/
 */
export const DEFAULT_BASER_CF_OAUTH_SCOPES =
  "account-settings.read workers-scripts.write d1.write";

/** @param {string | undefined} override */
export function resolveBaserCfOAuthScopes(override) {
  const raw = override?.trim();
  return raw || DEFAULT_BASER_CF_OAUTH_SCOPES;
}

/** Known-invalid legacy IDs (underscore form from API-token naming). */
const LEGACY_INVALID_SCOPE = /\b(?:account_settings|workers_scripts)\./;

/**
 * @param {string} scopes Space-separated scope string sent to authorize.
 * @returns {string | null} Error message, or null if shape looks OK.
 */
export function validateOAuthScopeShape(scopes) {
  const s = scopes.trim();
  if (!s) return "BASER_CF_OAUTH_SCOPES が空です";
  if (LEGACY_INVALID_SCOPE.test(s)) {
    return "OAuth scope はハイフン区切りです（例: account-settings.read workers-scripts.write）。API トークン名の workers_scripts は使えません";
  }
  if (/\baccount\.read\b/.test(s)) {
    return "account.read は OAuth カタログに無い場合があります。account-settings.read を使ってください";
  }
  return null;
}
