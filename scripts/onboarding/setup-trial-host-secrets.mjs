#!/usr/bin/env node
/**
 * One-shot: GitHub repo secrets + trial-host Worker secrets (except OAuth if env missing).
 */
import { randomBytes } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";

function ghSecretSet(name, value) {
  const r = spawnSync("gh", ["secret", "set", name, "--body", value], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    throw new Error(`gh secret set ${name} failed: ${r.stderr || r.stdout}`);
  }
}

function wranglerSecret(name, value) {
  const r = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--config", "wrangler.onboarding-host.jsonc"],
    {
      input: `${value}\n`,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (r.status !== 0) {
    throw new Error(`wrangler secret put ${name} failed: ${r.stderr || r.stdout}`);
  }
}

const callbackSecret = randomBytes(24).toString("hex");
const encryptionKey = randomBytes(32).toString("base64");
const dispatchToken = execSync("gh auth token", { encoding: "utf8" }).trim();

console.log("Setting GitHub Actions secrets…");
ghSecretSet("ONBOARDING_CALLBACK_SECRET", callbackSecret);
ghSecretSet("ONBOARDING_TOKEN_ENCRYPTION_KEY", encryptionKey);
ghSecretSet("GH_DISPATCH_TOKEN", dispatchToken);

console.log("Setting trial-host Worker secrets…");
wranglerSecret("ONBOARDING_CALLBACK_SECRET", callbackSecret);
wranglerSecret("ONBOARDING_TOKEN_ENCRYPTION_KEY", encryptionKey);
wranglerSecret("GH_DISPATCH_TOKEN", dispatchToken);

for (const key of ["BASER_CF_OAUTH_CLIENT_ID", "BASER_CF_OAUTH_CLIENT_SECRET"]) {
  const value = process.env[key]?.trim();
  if (!value) {
    console.warn(`Skip ${key} — set env and re-run: node scripts/onboarding/setup-trial-host-secrets.mjs`);
    continue;
  }
  wranglerSecret(key, value);
}

console.log("OK: onboarding GitHub + Worker secrets (OAuth optional via env).");
