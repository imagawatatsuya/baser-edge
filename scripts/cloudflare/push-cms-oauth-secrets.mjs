#!/usr/bin/env node
/**
 * Push CMS OAuth secrets from the current shell environment only.
 * Does not read deploy/cloudflare-secrets.json (safe when secrets stay out of the repo).
 *
 *   $env:BASER_CF_OAUTH_CLIENT_ID="..."
 *   $env:BASER_CF_OAUTH_CLIENT_SECRET="..."
 *   npm run push:cms-oauth-secrets
 */
import { run } from "./shared.mjs";
import { apiWorkerName, wranglerApiConfigRel } from "./stack.mjs";

const clientId = process.env.BASER_CF_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.BASER_CF_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Set BASER_CF_OAUTH_CLIENT_ID and BASER_CF_OAUTH_CLIENT_SECRET in your shell (not in chat, not in a committed file).",
  );
  console.error("Then run: npm run push:cms-oauth-secrets");
  process.exit(1);
}

for (const [key, value] of [
  ["BASER_CF_OAUTH_CLIENT_ID", clientId],
  ["BASER_CF_OAUTH_CLIENT_SECRET", clientSecret],
]) {
  console.log(`wrangler secret put ${key} (api)…`);
  run("npx", ["wrangler", "secret", "put", key, "--config", wranglerApiConfigRel(), "--name", apiWorkerName()], {
    silent: true,
    stdin: `${value}\n`,
  });
}

console.log("CMS OAuth secrets pushed to API worker.");
