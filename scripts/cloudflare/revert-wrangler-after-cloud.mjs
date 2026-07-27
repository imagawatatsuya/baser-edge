#!/usr/bin/env node
/**
 * Restore git-safe wrangler templates after prove/deploy.
 * Account ids live in deploy/cloudflare-state.json (gitignored), not in tracked wrangler files.
 */
import { resetWranglerConfigsToTemplate } from "./wrangler-template-reset.mjs";

resetWranglerConfigsToTemplate({ trialStripR2: true });
console.log("Wrangler configs reverted to repository placeholders (REPLACE_ME, example.invalid, trial d1-inline).");
