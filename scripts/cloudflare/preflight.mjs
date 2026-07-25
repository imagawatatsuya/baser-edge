#!/usr/bin/env node
/**
 * Checks prerequisites for prove:cloudflare (no deploy).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureLoggedIn, loadState, root, statePath, run } from "./shared.mjs";
import { ensureSecretsFile } from "./secrets-store.mjs";

ensureLoggedIn();
console.log("OK: Cloudflare (wrangler whoami)");

const adminDist = join(root, "apps", "admin-web", "dist", "index.html");
if (!existsSync(adminDist)) {
  console.log("Building admin-web…");
  run("npm", ["run", "build:admin-web"]);
}
console.log("OK: admin-web dist");

ensureSecretsFile();
console.log("OK: deploy/cloudflare-secrets.json");

const state = loadState();
if (state?.d1DatabaseId) {
  console.log(`OK: state (${statePath}) d1=${state.d1DatabaseId}`);
} else {
  console.log("Note: no deploy/cloudflare-state.json yet — prove will run provision");
}

console.log("\nNext: npm run prove:cloudflare");
