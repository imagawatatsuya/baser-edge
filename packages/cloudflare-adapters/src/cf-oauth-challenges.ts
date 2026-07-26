interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface Database {
  prepare(query: string): Statement;
}

export class D1CfOAuthChallengeStore {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async create(state: string, codeVerifier: string, expiresAt: number, createdAt: number): Promise<void> {
    await this.#db.prepare(
      "INSERT INTO cf_oauth_login_challenges(state,code_verifier,expires_at,created_at) VALUES(?,?,?,?)",
    ).bind(state, codeVerifier, expiresAt, createdAt).run();
  }

  async take(state: string, now: number): Promise<string | null> {
    const row = await this.#db.prepare(
      "SELECT code_verifier, expires_at FROM cf_oauth_login_challenges WHERE state=?",
    ).bind(state).first<{ code_verifier: string; expires_at: number }>();
    await this.#db.prepare("DELETE FROM cf_oauth_login_challenges WHERE state=?").bind(state).run();
    if (!row || row.expires_at <= now) return null;
    return row.code_verifier;
  }
}

export class MemoryCfOAuthChallengeStore {
  readonly #entries = new Map<string, { codeVerifier: string; expiresAt: number }>();

  async create(state: string, codeVerifier: string, expiresAt: number): Promise<void> {
    this.#entries.set(state, { codeVerifier, expiresAt });
  }

  async take(state: string, now: number): Promise<string | null> {
    const row = this.#entries.get(state);
    this.#entries.delete(state);
    if (!row || row.expiresAt <= now) return null;
    return row.codeVerifier;
  }
}
