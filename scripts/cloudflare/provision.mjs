#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { describeStack, requireProveConsent } from "./stack.mjs";
import { ensureLoggedIn } from "./shared.mjs";
import { runProvision } from "./run-provision.mjs";

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  requireProveConsent("provision:cloudflare");
  ensureLoggedIn();
  await runProvision();
  console.log("Next: BASER_CF_PROVE=1 npm run deploy:cloudflare");
}
