import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isOnboardingStackId, baserEdgeWorkerNames } from "../scripts/onboarding/cf-stack-verify.mjs";
import { publicTrialMode, trialServiceReady } from "../scripts/onboarding/onboarding-config.mjs";
import { checkRateLimit } from "../scripts/onboarding/rate-limit.mjs";
import {
  decryptOnboardingSecret,
  encryptOnboardingSecret,
} from "../scripts/onboarding/crypto-token.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function trialNoR2InSubprocess(env = {}) {
  const r = spawnSync(
    process.execPath,
    ["-e", "import { isTrialNoR2 } from './scripts/cloudflare/stack.mjs'; console.log(isTrialNoR2())"],
    { cwd: root, encoding: "utf8", env: { ...process.env, ...env } },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

test("onboarding stack ids are ob- prefixed and bounded", () => {
  assert.equal(isOnboardingStackId("ob-a1b2c3d4e5f6"), true);
  assert.equal(isOnboardingStackId("ob-" + "a".repeat(30)), true);
  assert.equal(isOnboardingStackId("lab"), false);
  assert.equal(isOnboardingStackId("ob-x"), false);
  assert.equal(isOnboardingStackId("baser-edge-api"), false);
});

test("onboarding worker names stay in baser-edge-api-ob-* namespace", () => {
  const names = baserEdgeWorkerNames("ob-deadbeefcafe");
  assert.equal(names.apiWorker, "baser-edge-api-ob-deadbeefcafe");
  assert.equal(names.publicWorker, "baser-edge-public-ob-deadbeefcafe");
});

test("trial without R2 is default; full stack is opt-in", () => {
  assert.equal(trialNoR2InSubprocess({ BASER_CF_FULL_STACK: undefined, BASER_TRIAL_NO_R2: undefined }), "true");
  assert.equal(trialNoR2InSubprocess({ BASER_CF_FULL_STACK: "1" }), "false");
  assert.equal(trialNoR2InSubprocess({ BASER_TRIAL_NO_R2: "0" }), "false");
});

test("public trial requires OAuth readiness for end users", () => {
  const prevPublic = process.env.BASER_ONBOARDING_PUBLIC;
  const prevNode = process.env.NODE_ENV;
  try {
    process.env.BASER_ONBOARDING_PUBLIC = "1";
    delete process.env.NODE_ENV;
    assert.equal(publicTrialMode(), true);
    assert.equal(trialServiceReady(false), false);
    assert.equal(trialServiceReady(true), true);

    process.env.BASER_ONBOARDING_PUBLIC = "0";
    assert.equal(publicTrialMode(), false);
    assert.equal(trialServiceReady(false), true);
  } finally {
    if (prevPublic === undefined) delete process.env.BASER_ONBOARDING_PUBLIC;
    else process.env.BASER_ONBOARDING_PUBLIC = prevPublic;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
  }
});

test("onboarding rate limit blocks after limit", () => {
  const key = `test-${Date.now()}`;
  const prev = process.env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN;
  process.env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN = "2";
  try {
    assert.equal(checkRateLimit(key).allowed, true);
    assert.equal(checkRateLimit(key).allowed, true);
    const blocked = checkRateLimit(key);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec >= 1);
  } finally {
    if (prev === undefined) delete process.env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN;
    else process.env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN = prev;
  }
});

test("one-click deploy entry exists for Cloudflare deploy button", () => {
  const dir = join(root, "deploy/one-click");
  assert.equal(existsSync(join(dir, "package.json")), true);
  assert.equal(existsSync(join(dir, "wrangler.jsonc")), true);
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(typeof pkg.scripts?.build, "string");
  assert.equal(typeof pkg.scripts?.deploy, "string");
});

test("onboarding token encryption roundtrip", () => {
  const prev = process.env.ONBOARDING_TOKEN_ENCRYPTION_KEY;
  process.env.ONBOARDING_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const plain = "cf-test-token-ob-abc";
    const packed = encryptOnboardingSecret(plain);
    assert.equal(decryptOnboardingSecret(packed), plain);
  } finally {
    if (prev === undefined) delete process.env.ONBOARDING_TOKEN_ENCRYPTION_KEY;
    else process.env.ONBOARDING_TOKEN_ENCRYPTION_KEY = prev;
  }
});
