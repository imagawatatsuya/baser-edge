import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const script = join(repoRoot, "scripts", "verify-wrangler-tracked.mjs");

test("verify-wrangler-tracked passes on repository templates", () => {
  const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("verify-wrangler-tracked rejects real database_id", () => {
  const dir = mkdtempSync(join(tmpdir(), "baser-verify-wrangler-"));
  try {
    writeFileSync(
      join(dir, "wrangler.trial.jsonc"),
      `{ "d1_databases": [{ "database_id": "b96f01ce-30cb-43c6-9ade-fcc14b5bf026" }] }`,
      "utf8",
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, BASER_EDGE_VERIFY_WRANGLER_ROOT: dir },
    });
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
