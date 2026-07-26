import { createApiBudget, CfApiCallError } from "@baser-edge/cf-stack-destroy";

const CF_API = "https://api.cloudflare.com/client/v4";
const LEGACY_RUNNER_SCRIPT = "baser-edge-trial-migrate";

/**
 * A Queue stage has a 35-call Cloudflare API budget. Apply one already-split
 * SQL statement per request and leave headroom for checkpoint bookkeeping.
 */
export const MIGRATION_STATEMENTS_PER_INVOCATION = 30;

type D1QueryResult = {
  success?: boolean;
  error?: string;
  results?: Record<string, unknown>[];
};

async function d1RequestHttp(
  token: string,
  accountId: string,
  databaseId: string,
  sql: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<D1QueryResult[]> {
  budget.spend(1);
  const res = await fetch(`${CF_API}/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message?: string; code?: number }[];
    result?: D1QueryResult[];
  };
  const failed = body.result?.find((result) => result.success === false);
  if (!res.ok || body.success === false || failed) {
    const errors = (body.errors ?? []).map((error) => ({
      code: error.code ?? 0,
      message: error.message ?? "Unknown D1 error",
    }));
    throw new CfApiCallError(
      errors[0]?.message ?? failed?.error ?? res.statusText ?? "D1 query failed",
      res.status,
      errors,
    );
  }
  return body.result ?? [];
}

async function d1QueryHttp(
  token: string,
  accountId: string,
  databaseId: string,
  sql: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<Record<string, unknown>[]> {
  const result = await d1RequestHttp(token, accountId, databaseId, sql, budget);
  return result[0]?.results ?? [];
}

async function d1ExecuteStatementHttp(
  token: string,
  accountId: string,
  databaseId: string,
  sql: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  try {
    await d1RequestHttp(token, accountId, databaseId, sql, budget);
  } catch (error) {
    // A Queue message can be redelivered after a statement committed but before
    // its next checkpoint was saved. Existing schema objects are safe to keep.
    if (error instanceof CfApiCallError && /already exists/i.test(error.message)) return;
    throw error;
  }
}

type SchemaObjectType = "table" | "index" | "trigger";
type SchemaObject = { type: SchemaObjectType; name: string };

/**
 * Extract the named SQLite objects that a migration pack promises to create.
 * D1 can contain a poisoned migration ledger after an interrupted legacy trial,
 * so the ledger alone is not sufficient evidence that the schema is usable.
 */
export function expectedMigrationSchemaObjects(migrations: MigrationPack[]): SchemaObject[] {
  const objects = new Map<string, SchemaObject>();
  for (const migration of migrations) {
    for (const statement of migration.statements) {
      const match = statement.match(
        /^\s*CREATE\s+(?:UNIQUE\s+)?(VIRTUAL\s+TABLE|TABLE|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][A-Za-z0-9_]*)/i,
      );
      if (!match?.[1] || !match[2]) continue;
      const kind = match[1].toUpperCase();
      const type: SchemaObjectType = kind.includes("TABLE")
        ? "table"
        : kind === "INDEX"
          ? "index"
          : "trigger";
      objects.set(`${type}:${match[2]}`, { type, name: match[2] });
    }
  }
  return [...objects.values()];
}

export async function baserEdgeSchemaReady(
  token: string,
  accountId: string,
  databaseId: string,
  migrations: MigrationPack[],
  budget: ReturnType<typeof createApiBudget>,
): Promise<boolean> {
  const expected = expectedMigrationSchemaObjects(migrations);
  if (expected.length === 0) return true;
  const names = expected.map(({ name }) => `'${name.replace(/'/g, "''")}'`).join(",");
  const rows = await d1QueryHttp(
    token,
    accountId,
    databaseId,
    `SELECT type,name FROM sqlite_master WHERE name IN (${names})`,
    budget,
  );
  const actual = new Set(rows.map((row) => `${String(row.type ?? "")}:${String(row.name ?? "")}`));
  return expected.every(({ type, name }) => actual.has(`${type}:${name}`));
}

function normalizeSql(sql: string): string {
  const t = sql.replace(/\r\n/g, "\n").trim();
  if (!t) return t;
  return t.endsWith(";") ? t : `${t};`;
}

export type TrialMigrationMode = "full" | "ledger";
export type TrialMigrationRunner = {
  mode: TrialMigrationMode;
};

function migrationStatements(migrations: MigrationPack[], mode: TrialMigrationMode): string[] {
  const ledgerSql = normalizeSql(`CREATE TABLE IF NOT EXISTS d1_migrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`);
  const statements: string[] = [ledgerSql];
  for (const migration of migrations) {
    if (mode === "full") {
      for (const statement of migration.statements) {
        const normalized = normalizeSql(statement);
        if (normalized) statements.push(normalized);
      }
    }
    const escaped = migration.name.replace(/'/g, "''");
    statements.push(normalizeSql(`INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${escaped}')`));
  }
  return statements;
}

export function trialMigrationStatementCount(
  migrations: MigrationPack[],
  mode: TrialMigrationMode,
): number {
  return migrationStatements(migrations, mode).length;
}

export async function prepareTrialMigrationRunner(
  token: string,
  accountId: string,
  databaseId: string,
  migrations: MigrationPack[],
  budget: ReturnType<typeof createApiBudget>,
): Promise<TrialMigrationRunner> {
  const mode: TrialMigrationMode = await baserEdgeSchemaReady(
    token,
    accountId,
    databaseId,
    migrations,
    budget,
  ) ? "ledger" : "full";
  return { mode };
}

export async function runTrialMigrationChunk(
  token: string,
  accountId: string,
  databaseId: string,
  runner: TrialMigrationRunner,
  migrations: MigrationPack[],
  cursor: number,
  budget: ReturnType<typeof createApiBudget>,
): Promise<{ nextCursor: number; done: boolean }> {
  const statements = migrationStatements(migrations, runner.mode);
  const chunk = statements.slice(cursor, cursor + MIGRATION_STATEMENTS_PER_INVOCATION);
  if (chunk.length === 0) return { nextCursor: cursor, done: true };

  for (const statement of chunk) {
    await d1ExecuteStatementHttp(token, accountId, databaseId, statement, budget);
  }
  const nextCursor = cursor + chunk.length;
  return { nextCursor, done: nextCursor >= statements.length };
}

export async function cleanupTrialMigrationRunner(
  token: string,
  accountId: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  // Direct D1 REST migrations create no temporary Worker. This stage remains
  // so a successful rerun removes one left by an earlier failed trial-host.
  try {
    budget.spend(1);
    await fetch(
      `${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(LEGACY_RUNNER_SCRIPT)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  } catch {
    /* best-effort legacy cleanup */
  }
}

export type MigrationPack = { name: string; statements: string[] };

export async function applyTrialMigrations(
  token: string,
  accountId: string,
  databaseId: string,
  migrations: MigrationPack[],
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  const schemaReady = await baserEdgeSchemaReady(token, accountId, databaseId, migrations, budget);
  const statements = migrationStatements(migrations, schemaReady ? "ledger" : "full");
  for (const statement of statements) {
    await d1ExecuteStatementHttp(token, accountId, databaseId, statement, budget);
  }
}
