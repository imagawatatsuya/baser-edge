#!/usr/bin/env node
/**
 * One-shot local proof: start in-memory stack → smoke:stack → exit.
 * Used by CI and `npm run prove:local`.
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { STACK_DEFAULT_API_PORT } from "./stack-port-utils.mjs";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const stackScript = join(repoRoot, "scripts", "serve-stack.mjs");
const smokeScript = join(repoRoot, "scripts", "smoke-local-flow.mjs");

const child = spawn(process.execPath, [stackScript], {
  cwd: repoRoot,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env },
});

let apiPort = Number(process.env.BASER_STACK_API_PORT ?? STACK_DEFAULT_API_PORT);
let stackReady = false;

function handleStackOutput(chunk) {
  const text = chunk.toString();
  const match = text.match(/BASER_STACK_READY api=(\d+) public=(\d+)/);
  if (match) {
    apiPort = Number(match[1]);
    process.env.BASER_STACK_API_PORT = match[1];
    process.env.BASER_STACK_PUBLIC_PORT = match[2];
    stackReady = true;
  }
}

child.stdout?.on("data", (chunk) => {
  handleStackOutput(chunk);
  process.stdout.write(chunk);
});
child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

function shutdown() {
  if (!child.pid || child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown();
    process.exit(signal === "SIGINT" ? 130 : 1);
  });
}

async function waitReady(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`serve-stack exited early (${child.exitCode})`);
    }
    if (!stackReady) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    const url = `http://127.0.0.1:${apiPort}/v1/auth/instant-entry`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        if (body.available) return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Local stack did not become ready in time");
}

try {
  await waitReady();
  const smoke = spawnSync(process.execPath, [smokeScript], {
    cwd: repoRoot,
    stdio: "inherit",
    encoding: "utf8",
    env: { ...process.env },
  });
  if (smoke.status !== 0) {
    process.exitCode = smoke.status ?? 1;
  } else {
    console.log("\n=== baserEdge local proof OK ===\n");
  }
} finally {
  shutdown();
}
