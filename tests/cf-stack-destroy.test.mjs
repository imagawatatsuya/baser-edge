import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRIAL_API_WORKER,
  TRIAL_D1_NAME,
  TRIAL_PUBLIC_WORKER,
  TRIAL_R2_BUCKET,
  TRIAL_STACK_ID,
  createApiBudget,
  destroyTrialStack,
  isAllowedTrialStackId,
} from "@baser-edge/cf-stack-destroy";

describe("cf-stack-destroy trial allowlist", () => {
  it("allows only trial stack id", () => {
    assert.equal(isAllowedTrialStackId("trial"), true);
    assert.equal(isAllowedTrialStackId("default"), false);
    assert.equal(isAllowedTrialStackId("lab"), false);
    assert.equal(isAllowedTrialStackId(""), false);
  });

  it("uses fixed resource names for trial", () => {
    assert.equal(TRIAL_STACK_ID, "trial");
    assert.equal(TRIAL_API_WORKER, "baser-edge-api-trial");
    assert.equal(TRIAL_PUBLIC_WORKER, "baser-edge-public-trial");
    assert.equal(TRIAL_D1_NAME, "baser-edge-trial");
    assert.equal(TRIAL_R2_BUCKET, "baser-edge-assets-trial");
  });
});

describe("destroyTrialStack dry-run", () => {
  it("rejects non-trial stack", async () => {
    await assert.rejects(() => destroyTrialStack("token", "acct", "default", { dryRun: true }), /not allowed/);
  });

  it("dry-run does not call fetch", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("{}");
    };
    try {
      const result = await destroyTrialStack("token", "acct", "trial", { dryRun: true, skipR2: true });
      assert.equal(calls, 0);
      assert.equal(result.dryRun, true);
      assert.equal(result.stackId, "trial");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("createApiBudget", () => {
  it("throws when budget exceeded", () => {
    const b = createApiBudget(2);
    b.spend(2);
    assert.throws(() => b.spend(1), /budget exceeded/);
  });
});
