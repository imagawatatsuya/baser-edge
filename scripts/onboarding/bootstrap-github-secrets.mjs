#!/usr/bin/env node
/**
 * Generate GitHub Actions secrets for onboarding-jobs (prints gh commands; does not commit secrets).
 */
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";

const callbackSecret = randomBytes(24).toString("hex");
const encryptionKey = randomBytes(32).toString("base64");

let dispatchToken = "";
try {
  dispatchToken = execSync("gh auth token", { encoding: "utf8" }).trim();
} catch {
  console.error("gh auth token failed — set GH_DISPATCH_TOKEN manually");
}

console.log("Run these (repo: imagawatatsuya/baser-edge):\n");
console.log(`gh secret set ONBOARDING_CALLBACK_SECRET --body "${callbackSecret}"`);
console.log(`gh secret set ONBOARDING_TOKEN_ENCRYPTION_KEY --body "${encryptionKey}"`);
if (dispatchToken) {
  console.log(`gh secret set GH_DISPATCH_TOKEN --body "${dispatchToken}"`);
}
console.log("\nAlso set on trial-host Worker (same encryption key + callback + dispatch):");
console.log(`ONBOARDING_CALLBACK_SECRET=${callbackSecret}`);
console.log(`ONBOARDING_TOKEN_ENCRYPTION_KEY=${encryptionKey}`);
if (dispatchToken) console.log(`GH_DISPATCH_TOKEN=(gh auth token)`);
