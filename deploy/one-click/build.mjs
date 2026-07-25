#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npm", ["ci"]);
run("npm", ["run", "build"]);
run("npm", ["run", "build:admin-web"]);
