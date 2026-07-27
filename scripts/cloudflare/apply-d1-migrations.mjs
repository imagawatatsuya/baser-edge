/**
 * Apply D1 migrations one statement at a time on remote.
 * Wrangler's `d1 migrations apply` batches an entire migration file; remote D1
 * often returns SQLITE "incomplete input" for our trigger-heavy 0001_initial.sql.
 */
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unstable_splitSqlQuery } from "wrangler";
import { root, wranglerResult } from "./shared.mjs";
import { d1DatabaseName, wranglerApiConfigRel } from "./stack.mjs";

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS d1_migrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;

export function parseWranglerJson(stdout) {
  const start = stdout.indexOf("[");
  if (start < 0) return null;
  return JSON.parse(stdout.slice(start));
}

/** @returns {Record<string, unknown>[]} */
export function d1QueryRemote(databaseName, sql, configRel = wranglerApiConfigRel()) {
  const dir = mkdtempSync(join(tmpdir(), "baser-d1-q-"));
  const file = join(dir, "query.sql");
  try {
    writeFileSync(file, sql, "utf8");
    const args = ["d1", "execute", databaseName, "--remote", "--config", configRel, "--file", file];
    const r = wranglerResult(args, { silent: true, env: { ...process.env, CI: "true", WRANGLER_CI: "1" } });
    const combined = `${r.stdout}\n${r.stderr}`;
    if (!r.ok) throw new Error(`d1 query failed (${r.status}):\n${combined}`);
    const payload = parseWranglerJson(r.stdout);
    const block = Array.isArray(payload) ? payload[0] : payload;
    return block?.results ?? [];
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function d1Query(databaseName, configRel, sql) {
  return d1QueryRemote(databaseName, sql, configRel);
}

function d1Execute({ databaseName, configRel, sql, log }) {
  const dir = mkdtempSync(join(tmpdir(), "baser-d1-"));
  const file = join(dir, "stmt.sql");
  try {
    writeFileSync(file, sql, "utf8");
    const args = ["d1", "execute", databaseName, "--remote", "--config", configRel, "--file", file];
    const r = wranglerResult(args, { silent: true, env: { ...process.env, CI: "true", WRANGLER_CI: "1" } });
    const combined = `${r.stdout}\n${r.stderr}`;
    if (!r.ok) {
      throw new Error(`d1 execute failed (${r.status}):\n${combined}`);
    }
    return combined;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function listMigrationFiles() {
  const dir = join(root, "migrations");
  return readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort();
}

function listAppliedMigrationNames(databaseName, configRel) {
  try {
    return d1Query(databaseName, configRel, "SELECT name FROM d1_migrations ORDER BY id").map((r) => r.name);
  } catch {
    return [];
  }
}

function tableExists(databaseName, configRel, tableName) {
  const safe = tableName.replace(/'/g, "''");
  const rows = d1Query(
    databaseName,
    configRel,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${safe}'`,
  );
  return rows.length > 0;
}

/** True when the remote DB already has the full v0.9 schema (prove re-run / missing ledger). */
export function baserEdgeSchemaReady(databaseName, configRel) {
  return (
    tableExists(databaseName, configRel, "workspaces") &&
    tableExists(databaseName, configRel, "auth_sessions") &&
    tableExists(databaseName, configRel, "theme_releases")
  );
}

function recordMigration(databaseName, configRel, fileName, log) {
  const escaped = fileName.replace(/'/g, "''");
  d1Execute({
    databaseName,
    configRel,
    sql: `INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${escaped}');`,
    log,
  });
}

function isAlreadyExistsError(err) {
  const msg = String(err);
  return /already exists/i.test(msg) || /duplicate column name/i.test(msg);
}

/**
 * @param {{ databaseName?: string, log?: (...args: unknown[]) => void }} [options]
 */
export function applyD1MigrationsRemote(options = {}) {
  const databaseName = options.databaseName ?? d1DatabaseName();
  const configRel = wranglerApiConfigRel();
  const log = options.log ?? console.log;

  d1Execute({ databaseName, configRel, sql: CREATE_MIGRATIONS_TABLE, log });

  const applied = new Set(listAppliedMigrationNames(databaseName, configRel));
  const files = listMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    log("D1 migrations: already up to date.");
    return { applied: [] };
  }

  if (pending.length === 0) {
    log("D1 migrations: already up to date.");
    return { applied: [] };
  }

  if (baserEdgeSchemaReady(databaseName, configRel) && applied.size === 0) {
    log("D1 baserEdge schema already present; syncing migration ledger (no SQL re-run)…");
    for (const fileName of files) recordMigration(databaseName, configRel, fileName, log);
    log(`D1 migrations: recorded ${files.length} file(s) in ledger.`);
    return { applied: files, backfilled: true };
  }

  const appliedNow = [];
  for (const fileName of pending) {
    log(`D1 migration ${fileName}…`);
    const sql = readFileSync(join(root, "migrations", fileName), "utf8");
    const statements = unstable_splitSqlQuery(sql);
    try {
      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        d1Execute({ databaseName, configRel, sql: stmt, log });
      }
    } catch (err) {
      if (!isAlreadyExistsError(err)) throw err;
      log(`D1 migration ${fileName} (objects already exist; recording ledger only)…`);
    }
    recordMigration(databaseName, configRel, fileName, log);
    appliedNow.push(fileName);
  }

  log(`D1 migrations: applied ${appliedNow.length} file(s).`);
  return { applied: appliedNow };
}
