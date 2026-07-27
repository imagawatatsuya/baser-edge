import test from "node:test";
import assert from "node:assert/strict";
import { trialApiWorkerVars, trialPublicWorkerVars } from "../packages/cf-trial-provision/dist/trial-worker-vars.js";

test("trial worker vars enable D1 inline asset storage", () => {
  assert.equal(trialPublicWorkerVars({ siteId: "site-1" }).BASER_ASSET_STORAGE, "d1-inline");
  assert.equal(trialApiWorkerVars({ apiUrl: "https://api.test", publicUrl: "https://pub.test" }).BASER_ASSET_STORAGE, "d1-inline");
});
