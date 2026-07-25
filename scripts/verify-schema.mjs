import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migrationDir = new URL("../migrations/", import.meta.url);
const migrations = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
const db = new DatabaseSync(":memory:");
try {
  for (const migration of migrations) db.exec(readFileSync(new URL(migration, migrationDir), "utf8"));
  const count = db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type IN ('table','view')").get();
  console.log(`schema ok: ${count.count} tables/views across ${migrations.length} migrations`);
} finally {
  db.close();
}
