import test from "node:test";
import assert from "node:assert/strict";
import { needsTrialMediaUpgrade } from "../scripts/cloudflare/upgrade-trial-media.mjs";

const baseState = { d1DatabaseId: "db-1", trialNoR2: true };

test("needsTrialMediaUpgrade when R2 is available and stack is trial-no-r2", () => {
  assert.equal(
    needsTrialMediaUpgrade(baseState, { trialNoR2Mode: false, r2Available: true }),
    true,
  );
});

test("needsTrialMediaUpgrade rejects when stack already has R2", () => {
  assert.equal(
    needsTrialMediaUpgrade({ ...baseState, trialNoR2: false }, { trialNoR2Mode: false, r2Available: true }),
    false,
  );
});

test("needsTrialMediaUpgrade rejects when prove still forces no R2", () => {
  assert.equal(
    needsTrialMediaUpgrade(baseState, { trialNoR2Mode: true, r2Available: true }),
    false,
  );
});

test("needsTrialMediaUpgrade rejects when R2 API is unavailable", () => {
  assert.equal(
    needsTrialMediaUpgrade(baseState, { trialNoR2Mode: false, r2Available: false }),
    false,
  );
});

test("needsTrialMediaUpgrade requires existing D1", () => {
  assert.equal(
    needsTrialMediaUpgrade({ trialNoR2: true }, { trialNoR2Mode: false, r2Available: true }),
    false,
  );
});
