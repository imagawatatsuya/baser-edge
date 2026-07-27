import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "./shared.mjs";

const API_VARS = [
  ["PUBLIC_BASE_URL", "https://api.example.invalid"],
  ["PREVIEW_BASE_URL", "https://preview.example.invalid"],
  ["BASER_INSTANT_LOGIN", "false"],
  ["BASER_INSTANT_OWNER_HINT", ""],
];

const WRANGLER_FILES = [
  "wrangler.jsonc",
  "wrangler.trial.jsonc",
  "wrangler.public.jsonc",
  "wrangler.public.trial.jsonc",
];

function setJsonStringVar(text, key, value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`("${key}":\\s*")((?:[^"\\\\]|\\\\.)*)(")`);
  if (re.test(text)) return text.replace(re, `$1${escaped}$3`);
  return text;
}

function stripOptionalAuthVars(text) {
  return text
    .replace(/\n\s*"BASER_AUTH_RP_ID":\s*"[^"]*",?/g, "")
    .replace(/\n\s*"BASER_AUTH_ORIGIN":\s*"[^"]*",?/g, "");
}

function stripTrialR2Block(text) {
  return text.replace(/\n\s*"r2_buckets":\s*\[[\s\S]*?\]\s*,/g, "");
}

export function ensureTrialInlineVarInText(text) {
  if (!/"vars":\s*\{/.test(text)) return text;
  if (/"r2_buckets"/.test(text)) {
    return text.replace(/\n\s*"BASER_ASSET_STORAGE":\s*"[^"]*",?/g, "");
  }
  if (/"BASER_ASSET_STORAGE"/.test(text)) {
    return text.replace(/"BASER_ASSET_STORAGE":\s*"[^"]*"/, '"BASER_ASSET_STORAGE": "d1-inline"');
  }
  return text.replace(/("vars":\s*\{)/, `$1\n    "BASER_ASSET_STORAGE": "d1-inline",`);
}

/**
 * Revert tracked wrangler configs after local prove/destroy so git never needs
 * account-specific workers.dev URLs, D1 ids, or bootstrap hints.
 */
export function resetWranglerConfigsToTemplate({ trialStripR2 = true } = {}) {
  for (const rel of WRANGLER_FILES) {
    const file = join(root, rel);
    if (!existsSync(file)) continue;
    let text = readFileSync(file, "utf8");
    text = text.replace(/"database_id":\s*"[^"]*"/g, '"database_id": "REPLACE_ME"');
    text = text.replace(/"SITE_ID":\s*"[^"]*"/g, '"SITE_ID": "REPLACE_ME"');
    if (rel === "wrangler.jsonc" || rel === "wrangler.trial.jsonc") {
      for (const [key, value] of API_VARS) {
        text = setJsonStringVar(text, key, value);
      }
      text = stripOptionalAuthVars(text);
      if (trialStripR2 && rel === "wrangler.trial.jsonc") {
        text = stripTrialR2Block(text);
      }
    }
    if (trialStripR2 && rel === "wrangler.public.trial.jsonc") {
      text = stripTrialR2Block(text);
    }
    if (rel === "wrangler.trial.jsonc" || rel === "wrangler.public.trial.jsonc") {
      text = ensureTrialInlineVarInText(text);
    }
    writeFileSync(file, text, "utf8");
  }
}
