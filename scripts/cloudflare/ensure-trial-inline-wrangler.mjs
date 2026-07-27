import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "./shared.mjs";

const TRIAL_API = "wrangler.trial.jsonc";
const TRIAL_PUBLIC = "wrangler.public.trial.jsonc";
const INLINE_VAR = `"BASER_ASSET_STORAGE": "d1-inline"`;

/** Ensure trial wrangler vars include D1 inline storage when R2 binding is absent. */
export function ensureTrialInlineWranglerVars({ log } = {}) {
  for (const rel of [TRIAL_API, TRIAL_PUBLIC]) {
    const file = join(root, rel);
    if (!existsSync(file)) continue;
    let text = readFileSync(file, "utf8");
    if (/"r2_buckets"/.test(text)) continue;
    if (/"BASER_ASSET_STORAGE"/.test(text)) {
      text = text.replace(/"BASER_ASSET_STORAGE":\s*"[^"]*"/, INLINE_VAR);
    } else if (/"vars":\s*\{/.test(text)) {
      text = text.replace(/("vars":\s*\{)/, `$1\n    ${INLINE_VAR},`);
    } else {
      continue;
    }
    writeFileSync(file, text, "utf8");
    log?.(`Trial inline media var ensured in ${rel}`);
  }
}
