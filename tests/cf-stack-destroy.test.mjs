import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TRIAL_API_WORKER,
  TRIAL_D1_NAME,
  TRIAL_PUBLIC_WORKER,
  TRIAL_R2_BUCKET,
  TRIAL_STACK_ID,
  BrokerTeardownRequestError,
  createApiBudget,
  destroyTrialStack,
  isAllowedTrialStackId,
  parseBrokerTeardownRequest,
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

describe("broker teardown request validation", () => {
  it("accepts only a trimmed token for the fixed trial stack", () => {
    assert.deepEqual(parseBrokerTeardownRequest({ accessToken: " token ", stackId: "trial" }), {
      accessToken: "token",
      stackId: "trial",
    });
  });

  it("rejects a missing access token with a stable code", () => {
    assert.throws(
      () => parseBrokerTeardownRequest({ stackId: "trial" }),
      (error) =>
        error instanceof BrokerTeardownRequestError &&
        error.code === "MISSING_ACCESS_TOKEN",
    );
  });

  it("rejects every non-trial stack with a stable code", () => {
    assert.throws(
      () => parseBrokerTeardownRequest({ accessToken: "token", stackId: "production" }),
      (error) =>
        error instanceof BrokerTeardownRequestError &&
        error.code === "INVALID_STACK",
    );
  });
});

it("hosted no-R2 trial teardown does not request undeclared R2 OAuth access", () => {
  const operationsWorker = readFileSync(
    join(process.cwd(), "apps/cloud-operations-worker/src/index.ts"),
    "utf8",
  );
  assert.match(operationsWorker, /source: "oauth_broker"[\s\S]*?skipR2: true/);
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
