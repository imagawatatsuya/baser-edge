#!/usr/bin/env node
/**
 * Fail if tracked wrangler configs contain account-specific values (would leak via git).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.BASER_EDGE_VERIFY_WRANGLER_ROOT
  ? join(process.env.BASER_EDGE_VERIFY_WRANGLER_ROOT)
  : join(fileURLToPath(new URL("..", import.meta.url)), "..");
const FILES = [
  "wrangler.jsonc",
  "wrangler.trial.jsonc",
  "wrangler.public.jsonc",
  "wrangler.public.trial.jsonc",
];

const RULES = [
  {
    name: "database_id must be REPLACE_ME",
    test: (text) => /"database_id":\s*"(?!REPLACE_ME)([^"]+)"/.test(text),
  },
  {
    name: "SITE_ID must be REPLACE_ME in public configs",
    test: (text, rel) =>
      rel.includes("public") && /"SITE_ID":\s*"(?!REPLACE_ME)([^"]+)"/.test(text),
  },
  {
    name: "no workers.dev URLs in PUBLIC_BASE_URL / PREVIEW_BASE_URL",
    test: (text) =>
      /"(?:PUBLIC_BASE_URL|PREVIEW_BASE_URL)":\s*"https:\/\/[^"]*\.workers\.dev/i.test(text),
  },
  {
    name: "no instant-login owner hint in tracked wrangler",
    test: (text) => /"BASER_INSTANT_OWNER_HINT":\s*"\{/.test(text),
  },
];

let failed = false;
for (const rel of FILES) {
  const file = join(root, rel);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const rule of RULES) {
    if (rule.test(text, rel)) {
      console.error(`verify-wrangler: ${rel} — ${rule.name}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("\nRun: npm run revert:wrangler");
  console.error("Account-specific IDs belong in deploy/cloudflare-state.json (gitignored).\n");
  process.exit(1);
}

console.log("verify-wrangler: ok");
