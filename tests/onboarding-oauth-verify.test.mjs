import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workerSrc = readFileSync(
  join(process.cwd(), "apps/onboarding-worker/src/index.ts"),
  "utf8",
);

describe("onboarding OAuth bearer verification", () => {
  it("does not use /user/tokens/verify (OAuth access tokens are not API tokens)", () => {
    assert.doesNotMatch(workerSrc, /user\/tokens\/verify/);
    assert.match(workerSrc, /listAccounts\(apiToken\)/);
  });
});
