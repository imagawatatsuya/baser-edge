import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "./shared.mjs";
import { r2BucketName } from "./stack.mjs";

const TRIAL_CONFIGS = ["wrangler.trial.jsonc", "wrangler.public.trial.jsonc"];

/** Add R2 binding to trial wrangler files when missing (stay on trial vars + instant login). */
export function ensureWranglerR2Bindings({ log } = {}) {
  const bucket = r2BucketName();
  const block = `  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "${bucket}"
    }
  ],`;
  for (const rel of TRIAL_CONFIGS) {
    const file = join(root, rel);
    if (!existsSync(file)) continue;
    let text = readFileSync(file, "utf8");
    if (/"r2_buckets"/.test(text)) {
      text = text.replace(/"bucket_name":\s*"[^"]*"/, `"bucket_name": "${bucket}"`);
      writeFileSync(file, text, "utf8");
      continue;
    }
    if (!/"d1_databases"/.test(text)) continue;
    text = text.replace(/("d1_databases":\s*\[[\s\S]*?\]\s*,)/, `$1\n${block}\n`);
    writeFileSync(file, text, "utf8");
    log?.(`Added R2 binding to ${rel}`);
  }
}
