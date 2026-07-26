import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decodeCfOAuthRelayState,
  encodeCfOAuthRelayState,
  isAllowedTrialCmsOAuthRelayOrigin,
  isExternalOAuthRedirectUri,
  resolveCfOAuthChallengeState,
} from "../packages/auth-kernel/dist/cf-oauth.js";

describe("cf-oauth relay state", () => {
  it("round-trips site origin and challenge key", () => {
    const state = encodeCfOAuthRelayState("https://baser-edge-api-trial.foo.workers.dev", "abc123");
    assert.ok(state.startsWith("be1."));
    assert.deepEqual(decodeCfOAuthRelayState(state), {
      siteOrigin: "https://baser-edge-api-trial.foo.workers.dev",
      challengeKey: "abc123",
    });
    assert.deepEqual(resolveCfOAuthChallengeState(state), {
      challengeKey: "abc123",
      expectedSiteOrigin: "https://baser-edge-api-trial.foo.workers.dev",
    });
  });

  it("passes through legacy state", () => {
    assert.equal(resolveCfOAuthChallengeState("plain-state").challengeKey, "plain-state");
    assert.equal(resolveCfOAuthChallengeState("plain-state").expectedSiteOrigin, undefined);
  });

  it("detects external redirect URI", () => {
    assert.equal(
      isExternalOAuthRedirectUri(
        "https://trial-host.workers.dev/api/cms-oauth/callback",
        "https://user-api.workers.dev",
      ),
      true,
    );
    assert.equal(
      isExternalOAuthRedirectUri(
        "https://user-api.workers.dev/v1/auth/cloudflare/callback",
        "https://user-api.workers.dev",
      ),
      false,
    );
  });

  it("allows workers.dev relay targets only", () => {
    assert.equal(isAllowedTrialCmsOAuthRelayOrigin("https://x.workers.dev"), true);
    assert.equal(isAllowedTrialCmsOAuthRelayOrigin("http://x.workers.dev"), false);
    assert.equal(isAllowedTrialCmsOAuthRelayOrigin("https://evil.example"), false);
  });
});
