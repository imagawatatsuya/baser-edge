import test from "node:test";
import assert from "node:assert/strict";
import { ensureTrialInlineVarInText } from "../scripts/cloudflare/wrangler-template-reset.mjs";

test("ensureTrialInlineVarInText adds d1-inline when no R2 block", () => {
  const input = `{
  "vars": {
    "BASER_ENV": "preview"
  }
}`;
  const out = ensureTrialInlineVarInText(input);
  assert.match(out, /"BASER_ASSET_STORAGE": "d1-inline"/);
});

test("ensureTrialInlineVarInText removes inline var when R2 block present", () => {
  const input = `{
  "r2_buckets": [{ "binding": "R2" }],
  "vars": {
    "BASER_ASSET_STORAGE": "d1-inline",
    "SITE_ID": "x"
  }
}`;
  const out = ensureTrialInlineVarInText(input);
  assert.doesNotMatch(out, /BASER_ASSET_STORAGE/);
});

test("ensureTrialInlineVarInText normalizes existing inline var", () => {
  const input = `"vars": { "BASER_ASSET_STORAGE": "wrong" }`;
  const out = ensureTrialInlineVarInText(input);
  assert.match(out, /"BASER_ASSET_STORAGE": "d1-inline"/);
});
