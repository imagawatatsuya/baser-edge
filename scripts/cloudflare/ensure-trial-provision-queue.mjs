#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const queueName = "baser-edge-trial-provision";
const config = "wrangler.onboarding-host.jsonc";

function runWrangler(args, silent) {
  return spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: silent ? "pipe" : "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      CI: "true",
      WRANGLER_CI: "1",
      WRANGLER_LOG_PATH:
        process.env.WRANGLER_LOG_PATH || join(tmpdir(), "baser-edge-trial-provision-queue-wrangler.log"),
    },
  });
}

const listed = runWrangler(["queues", "list", "--config", config], true);
if (listed.status !== 0) {
  const detail = listed.stderr || listed.stdout || "unknown error";
  throw new Error(`Cloudflare Queues の一覧取得に失敗しました: ${detail.trim()}`);
}

const queueExists = (listed.stdout ?? "")
  .split(/\r?\n/)
  .some((line) => line.split(/\s+/).includes(queueName));

if (queueExists) {
  console.log(`Queue は作成済みです: ${queueName}`);
  process.exit(0);
}

console.log(`Queue を作成します: ${queueName}`);
const created = runWrangler(["queues", "create", queueName, "--config", config], false);
if (created.status !== 0) {
  throw new Error(`Cloudflare Queue ${queueName} の作成に失敗しました`);
}
