import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { patchInstantLogin } from "../scripts/cloudflare/wrangler-vars.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const trialPath = join(root, "wrangler.trial.jsonc");

test("patchInstantLogin stores JSON owner hint wrangler can pass to the worker", () => {
  const backup = readFileSync(trialPath, "utf8");
  const hint = {
    workspaceId: "ws_wrangler_vars_test",
    ownerPrincipalId: "prn_wrangler_vars_test",
    siteId: "site_wrangler_vars_test",
    siteName: "マイサイト",
    publicUrl: "https://public.example.workers.dev",
  };
  try {
    patchInstantLogin(hint);
    const text = readFileSync(trialPath, "utf8");
    const match = text.match(/"BASER_INSTANT_OWNER_HINT":\s*"((?:[^"\\]|\\.)*)"/);
    assert.ok(match, "BASER_INSTANT_OWNER_HINT in wrangler.trial.jsonc");
    const envValue = JSON.parse(`"${match[1]}"`);
    const parsed = JSON.parse(envValue);
    assert.equal(parsed.workspaceId, hint.workspaceId);
    assert.equal(parsed.siteId, hint.siteId);
    assert.equal(text.includes("\\\\\\\"workspaceId"), false, "should not double-escape JSON");
  } finally {
    writeFileSync(trialPath, backup, "utf8");
  }
});
