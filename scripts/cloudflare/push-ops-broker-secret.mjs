#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { run } from "./shared.mjs";

const secret = process.env.BASER_OPS_BROKER_SECRET?.trim() || randomBytes(32).toString("base64url");
const targets = [
  ["wrangler.cloud-operations.jsonc", "Cloud Operations Worker"],
  ["wrangler.onboarding-host.jsonc", "trial-host Worker"],
];

for (const [config, label] of targets) {
  console.log(`wrangler secret put BASER_OPS_BROKER_SECRET (${label})…`);
  run("npx", ["wrangler", "secret", "put", "BASER_OPS_BROKER_SECRET", "--config", config], {
    silent: true,
    stdin: `${secret}\n`,
  });
}

console.log("OK: both Workers now share the same broker secret.");
