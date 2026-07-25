#!/usr/bin/env node
/**
 * Copy OAuth secrets from env into trial-host Worker (same values as cloud-operations).
 * Usage (PowerShell):
 *   $env:BASER_CF_OAUTH_CLIENT_ID="..."; $env:BASER_CF_OAUTH_CLIENT_SECRET="..."; node scripts/cloudflare/push-onboarding-host-secrets.mjs
 */
import { run } from "./shared.mjs";

const keys = ["BASER_CF_OAUTH_CLIENT_ID", "BASER_CF_OAUTH_CLIENT_SECRET"];
const config = "wrangler.onboarding-host.jsonc";

for (const key of keys) {
  const value = process.env[key]?.trim();
  if (!value) {
    console.error(`Missing ${key} in environment`);
    process.exit(1);
  }
  console.log(`wrangler secret put ${key} (trial-host)…`);
  run("npx", ["wrangler", "secret", "put", key, "--config", config], {
    silent: true,
    stdin: `${value}\n`,
  });
}

const workerSecrets = ["GH_DISPATCH_TOKEN", "ONBOARDING_CALLBACK_SECRET", "ONBOARDING_TOKEN_ENCRYPTION_KEY"];
for (const key of workerSecrets) {
  const value = process.env[key]?.trim();
  if (!value) continue;
  console.log(`wrangler secret put ${key} (trial-host)…`);
  run("npx", ["wrangler", "secret", "put", key, "--config", config], {
    silent: true,
    stdin: `${value}\n`,
  });
}

console.log("Done.");
