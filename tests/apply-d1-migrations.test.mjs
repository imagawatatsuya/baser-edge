import { test } from "node:test";
import assert from "node:assert/strict";
import { unstable_splitSqlQuery } from "wrangler";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

test("0001_initial splits into multiple statements for per-statement remote apply", () => {
  const sql = readFileSync(join(root, "migrations/0001_initial.sql"), "utf8");
  const parts = unstable_splitSqlQuery(sql);
  assert.ok(parts.length >= 40);
  assert.ok(parts.some((p) => p.includes("CREATE TRIGGER validate_revision_commit")));
});
