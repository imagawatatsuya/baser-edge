import { createApiBudget, CfApiCallError } from "@baser-edge/cf-stack-destroy";
import {
  fetchWorkersSubdomain,
  publishWorkerToWorkersDev,
  putWorkerScript,
  putWorkerSecrets,
  workerSubdomainUrl,
} from "./deploy-worker.js";

const CF_API = "https://api.cloudflare.com/client/v4";
const RUNNER_SCRIPT = "baser-edge-trial-migrate";
const RUNNER_MODULE = "index.js";

/**
 * Keep every temporary Migration Worker invocation below the Workers Free D1
 * subrequest ceiling. The Queue invokes the runner once per chunk.
 */
export const MIGRATION_STATEMENTS_PER_INVOCATION = 30;
export const MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS = 12;

/**
 * This exact module is uploaded to the user's account with a D1 binding.
 * D1.prepare().run() treats CREATE TRIGGER as one SQLite statement, unlike the
 * control-plane /query endpoint which splits its internal semicolons.
 */
export function trialMigrationRunnerSource(): string {
  return String.raw`
const MAX_STATEMENTS = ${MIGRATION_STATEMENTS_PER_INVOCATION};

async function secretsEqual(provided, expected) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

function json(body, status = 200) {
  return Response.json(body, { status });
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return json({ ok: true, service: "baser-edge-trial-migrate" });
    }
    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const authorization = request.headers.get("Authorization") || "";
    const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expected = typeof env.MIGRATE_RUNNER_SECRET === "string"
      ? env.MIGRATE_RUNNER_SECRET
      : "";
    if (!provided || !expected || !(await secretsEqual(provided, expected))) {
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }
    const statements = body && body.statements;
    if (!Array.isArray(statements) || statements.length === 0) {
      return json({ ok: false, code: "STATEMENTS_REQUIRED" }, 422);
    }
    if (statements.length > MAX_STATEMENTS) {
      return json({ ok: false, code: "TOO_MANY_STATEMENTS" }, 422);
    }
    if (statements.some((statement) => typeof statement !== "string" || !statement.trim())) {
      return json({ ok: false, code: "INVALID_STATEMENT" }, 422);
    }

    let applied = 0;
    let skipped = 0;
    for (let index = 0; index < statements.length; index += 1) {
      const sql = statements[index].trim();
      try {
        await env.DB.prepare(sql).run();
        applied += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/already exists/i.test(message)) {
          skipped += 1;
          continue;
        }
        return json({
          ok: false,
          code: "MIGRATION_STATEMENT_FAILED",
          error: message,
          statementIndex: index,
        }, 500);
      }
    }
    return json({ ok: true, applied, skipped });
  },
};
`.trim();
}

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
  url: string;
  secret: string;
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

  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);
  const secret = [...secretBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  await putWorkerScript(
    token,
    accountId,
    RUNNER_SCRIPT,
    RUNNER_MODULE,
    trialMigrationRunnerSource(),
    {
      d1DatabaseId: databaseId,
      workersDev: true,
      vars: {},
    },
    budget,
  );
  await putWorkerSecrets(
    token,
    accountId,
    RUNNER_SCRIPT,
    { MIGRATE_RUNNER_SECRET: secret },
    budget,
  );

  const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
  if (!subdomain) {
    throw new Error(
      "この Cloudflare アカウントで workers.dev サブドメインが未設定です。Workers の初回セットアップを完了してください。",
    );
  }
  const url = workerSubdomainUrl(RUNNER_SCRIPT, subdomain).replace(/\/$/, "");
  await publishWorkerToWorkersDev(token, accountId, RUNNER_SCRIPT, budget, {
    httpProbeUrl: url,
    httpProbeOptions: { maxAttempts: MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS },
  });

  return { mode, url, secret };
}

async function invokeMigrationRunner(
  runner: TrialMigrationRunner,
  statements: string[],
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  budget.spend(1);
  const res = await fetch(runner.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runner.secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ statements }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    error?: string;
    statementIndex?: number;
  };
  if (!res.ok || !body.ok) {
    const index = Number.isInteger(body.statementIndex) ? ` at chunk index ${body.statementIndex}` : "";
    const detail = body.error ?? body.code ?? res.statusText ?? "Unknown migration runner error";
    throw new Error(`マイグレーション Worker が失敗しました (${res.status})${index}: ${detail}`);
  }
}

export async function runTrialMigrationChunk(
  _token: string,
  _accountId: string,
  _databaseId: string,
  runner: TrialMigrationRunner,
  migrations: MigrationPack[],
  cursor: number,
  budget: ReturnType<typeof createApiBudget>,
): Promise<{ nextCursor: number; done: boolean }> {
  const statements = migrationStatements(migrations, runner.mode);
  const chunk = statements.slice(cursor, cursor + MIGRATION_STATEMENTS_PER_INVOCATION);
  if (chunk.length === 0) return { nextCursor: cursor, done: true };

  await invokeMigrationRunner(runner, chunk, budget);
  const nextCursor = cursor + chunk.length;
  return { nextCursor, done: nextCursor >= statements.length };
}

export async function cleanupTrialMigrationRunner(
  token: string,
  accountId: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  try {
    budget.spend(1);
    await fetch(
      `${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(RUNNER_SCRIPT)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  } catch {
    /* best-effort cleanup; the next run replaces this fixed-name helper */
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
  const runner = await prepareTrialMigrationRunner(
    token,
    accountId,
    databaseId,
    migrations,
    budget,
  );
  let cursor = 0;
  try {
    while (true) {
      const chunk = await runTrialMigrationChunk(
        token,
        accountId,
        databaseId,
        runner,
        migrations,
        cursor,
        budget,
      );
      cursor = chunk.nextCursor;
      if (chunk.done) break;
    }
  } finally {
    await cleanupTrialMigrationRunner(token, accountId, budget);
  }
}
