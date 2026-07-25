import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { displayPath, root } from "../scripts/cloudflare/shared.mjs";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));

const WRANGLER_FILES = [
  "wrangler.jsonc",
  "wrangler.trial.jsonc",
  "wrangler.public.jsonc",
  "wrangler.public.trial.jsonc",
];

for (const rel of WRANGLER_FILES) {
  const text = readFileSync(join(repoRoot, rel), "utf8");
  assert.equal(
    text.includes(".workers.dev"),
    false,
    `${rel} must not contain account-specific *.workers.dev URLs`,
  );
  assert.match(
    text,
    /"database_id":\s*"REPLACE_ME"/,
    `${rel} database_id must be REPLACE_ME in git`,
  );
}

const abs = join(root, "deploy", "cloudflare-state.json");
assert.equal(displayPath(abs), "deploy/cloudflare-state.json");

const outside = resolve(root, "..", "outside-repo-secret.json");
assert.equal(displayPath(outside), "deploy/cloudflare-state.json");

console.log("wrangler-template-sanity: ok");
