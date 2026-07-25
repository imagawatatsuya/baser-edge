import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BASER_CF_OAUTH_SCOPES,
  resolveBaserCfOAuthScopes,
  validateOAuthScopeShape,
} from "../scripts/onboarding/cf-oauth-scopes.mjs";

describe("cf-oauth-scopes", () => {
  it("uses hyphenated Cloudflare OAuth scope IDs", () => {
    assert.equal(
      DEFAULT_BASER_CF_OAUTH_SCOPES,
      "account-settings.read workers-scripts.write d1.write",
    );
    assert.equal(validateOAuthScopeShape(DEFAULT_BASER_CF_OAUTH_SCOPES), null);
  });

  it("rejects legacy underscore scope IDs", () => {
    assert.match(
      validateOAuthScopeShape("account_settings.read workers_scripts.write d1.write") ?? "",
      /ハイフン/,
    );
  });

  it("resolve honors override", () => {
    assert.equal(resolveBaserCfOAuthScopes("d1.write"), "d1.write");
    assert.equal(resolveBaserCfOAuthScopes(""), DEFAULT_BASER_CF_OAUTH_SCOPES);
  });
});
