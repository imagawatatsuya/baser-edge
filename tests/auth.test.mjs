import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "../packages/content-kernel/dist/index.js";
import { D1CmsStore } from "../packages/cloudflare-adapters/dist/index.js";
import {
  buildTestAuthenticationResponse,
  buildTestRegistrationResponse,
  CSRF_HEADER,
  StepUpOperations,
} from "../packages/auth-kernel/dist/index.js";

const THEME_TOKENS = {
  colorBackground: "#fffdf8", colorSurface: "#ffffff", colorText: "#202018", colorMuted: "#666655",
  colorAccent: "#8a3b12", colorBorder: "#ded8cc", fontFamily: 'system-ui,"Noto Sans JP",sans-serif',
  baseFontSize: 17, lineHeight: 1.8, contentMaxWidth: 980, spacingScale: 1, radius: 12,
};
const THEME_LAYOUT = { header: "brand", navigation: "none", footer: "simple", showSiteName: true, footerText: "Auth Theme", mainClass: "bc-page migrated-page" };

const migrationDir = new URL("../migrations/", import.meta.url);
const migrations = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();

function applyMigrations(db) {
  for (const migration of migrations) db.exec(readFileSync(new URL(migration, migrationDir), "utf8"));
}

function parseSetCookies(response) {
  const cookies = new Map();
  for (const value of response.headers.getSetCookie?.() ?? []) {
    const [pair] = value.split(";");
    const [name, cookieValue] = pair.split("=");
    cookies.set(name, cookieValue);
  }
  return cookies;
}

async function bootstrapWorker(worker, env = {}) {
  const response = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceName: "Auth", siteName: "Site", hostname: "auth.test", ownerName: "Owner" }),
  }), env);
  assert.equal(response.status, 201);
  return response.json();
}

async function registerPasskey(worker, boot, env = {}, label = "owner") {
  const devHeaders = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const begin = await worker.fetch(new Request("https://api.test/v1/auth/passkeys/register/begin", {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({ workspaceId: boot.workspaceId, principalId: boot.ownerPrincipalId, label }),
  }), env);
  const beginBody = await begin.json();
  const registration = buildTestRegistrationResponse(beginBody.options.challenge);
  const finish = await worker.fetch(new Request("https://api.test/v1/auth/passkeys/register/finish", {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({
      challengeId: beginBody.challengeId,
      response: registration,
    }),
  }), env);
  assert.equal(finish.status, 201);
  return registration.id;
}

async function login(worker, boot, credentialId, env = {}, label = "owner") {
  const begin = await worker.fetch(new Request("https://api.test/v1/auth/login/begin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId: boot.workspaceId, principalId: boot.ownerPrincipalId, label }),
  }), env);
  const beginBody = await begin.json();
  const finish = await worker.fetch(new Request("https://api.test/v1/auth/login/finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challengeId: beginBody.challengeId,
      response: buildTestAuthenticationResponse(beginBody.options.challenge, credentialId),
    }),
  }), env);
  assert.equal(finish.status, 201);
  return parseSetCookies(finish);
}

function sessionHeaders(cookies, { csrf = false } = {}) {
  const headers = {
    cookie: `baser_session=${cookies.get("baser_session")}; baser_csrf=${cookies.get("baser_csrf")}`,
  };
  if (csrf) headers[CSRF_HEADER] = cookies.get("baser_csrf");
  return headers;
}

test("passkey registration, login, session listing and logout use secure cookies", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const boot = await bootstrapWorker(worker);
  const credentialId = await registerPasskey(worker, boot);
  const cookies = await login(worker, boot, credentialId);

  const session = await worker.fetch(new Request("https://api.test/v1/auth/session", { headers: sessionHeaders(cookies) }), {});
  assert.equal(session.status, 200);

  const sessions = await worker.fetch(new Request("https://api.test/v1/auth/sessions", { headers: sessionHeaders(cookies) }), {});
  const listed = await sessions.json();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].current, true);

  const logout = await worker.fetch(new Request("https://api.test/v1/auth/logout", {
    method: "POST",
    headers: sessionHeaders(cookies, { csrf: true }),
  }), {});
  assert.equal(logout.status, 204);
});

test("cookie-authenticated mutations require CSRF protection", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const boot = await bootstrapWorker(worker);
  const credentialId = await registerPasskey(worker, boot);
  const cookies = await login(worker, boot, credentialId);

  const denied = await worker.fetch(new Request("https://api.test/v1/auth/logout", {
    method: "POST",
    headers: sessionHeaders(cookies),
  }), {});
  assert.equal(denied.status, 403);
});

test("production rejects development principal headers", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const boot = await bootstrapWorker(worker);
  const response = await worker.fetch(new Request("https://api.test/v1/pages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-baser-principal-id": boot.ownerPrincipalId,
      "x-baser-principal-type": "human",
    },
    body: JSON.stringify({
      siteId: boot.siteId,
      parentId: null,
      slug: "x",
      title: "X",
      document: { formatVersion: 1, root: { id: "root", type: "document", children: [] } },
    }),
  }), { BASER_ENV: "production" });
  assert.equal(response.status, 403);
});

test("step-up is required for session-authenticated theme activation", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const boot = await bootstrapWorker(worker);
  const credentialId = await registerPasskey(worker, boot);
  const cookies = await login(worker, boot, credentialId);
  const headers = { ...sessionHeaders(cookies, { csrf: true }), "content-type": "application/json" };

  const themeCreate = await worker.fetch(new Request("https://api.test/v1/themes", {
    method: "POST",
    headers,
    body: JSON.stringify({ workspaceId: boot.workspaceId, key: "site", name: "Site Theme" }),
  }), {});
  const theme = await themeCreate.json();
  const tokenRev = await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/token-revisions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "tokens", tokens: THEME_TOKENS }),
  }), {});
  const tokens = await tokenRev.json();
  assert.equal(tokenRev.status, 201);
  const layoutRev = await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/layout-revisions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "layout", layout: THEME_LAYOUT }),
  }), {});
  const layout = await layoutRev.json();
  assert.equal(layoutRev.status, 201);
  const release = await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/releases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version: "1.0.0",
      designTokenRevisionId: tokens.id,
      layoutRevisionId: layout.id,
      manifest: { rendererApiVersion: 1, variant: "light", supportedContentTypes: ["*"], cssText: ".x{}", source: { kind: "native" } },
    }),
  }), {});
  assert.equal(release.status, 201);
  const releaseBody = await release.json();

  const denied = await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/theme-activations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ themeReleaseId: releaseBody.id }),
  }), {});
  assert.equal(denied.status, 403);

  const stepBegin = await worker.fetch(new Request("https://api.test/v1/auth/step-up/begin", {
    method: "POST",
    headers,
    body: JSON.stringify({ operation: StepUpOperations.ThemeActivate }),
  }), {});
  const stepBeginBody = await stepBegin.json();
  await worker.fetch(new Request("https://api.test/v1/auth/step-up/finish", {
    method: "POST",
    headers,
    body: JSON.stringify({
      challengeId: stepBeginBody.challengeId,
      response: buildTestAuthenticationResponse(stepBeginBody.options.challenge, credentialId),
    }),
  }), {});

  const allowed = await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/theme-activations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ themeReleaseId: releaseBody.id }),
  }), {});
  assert.equal(allowed.status, 201);
});

test("preview instant login issues session without passkey", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const boot = await bootstrapWorker(worker, {});
  const hint = JSON.stringify({
    workspaceId: boot.workspaceId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteId: boot.siteId,
    siteName: "デモ",
  });
  const env = { BASER_INSTANT_LOGIN: "true", BASER_INSTANT_OWNER_HINT: hint };
  const entry = await worker.fetch(new Request("https://api.test/v1/auth/instant-entry"), env);
  assert.equal(entry.status, 200);
  const entryBody = await entry.json();
  assert.equal(entryBody.available, true);
  const login = await worker.fetch(new Request("https://api.test/v1/auth/instant-login", { method: "POST" }), env);
  assert.equal(login.status, 201);
  const cookies = parseSetCookies(login);
  const session = await worker.fetch(new Request("https://api.test/v1/auth/session", { headers: sessionHeaders(cookies) }), env);
  assert.equal(session.status, 200);
});

test("instant login is disabled in production", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const worker = createApiWorker(() => cms);
  const env = {
    BASER_ENV: "production",
    BASER_INSTANT_LOGIN: "true",
    BASER_INSTANT_OWNER_HINT: "{}",
  };
  const login = await worker.fetch(new Request("https://api.test/v1/auth/instant-login", { method: "POST" }), env);
  assert.equal(login.status, 404);
});

test("D1 auth store persists sessions and passkeys", async () => {
  const db = new DatabaseSync(":memory:");
  applyMigrations(db);
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    async first() { return db.prepare(this.sql).get(...this.values) ?? null; }
    async all() { return { results: db.prepare(this.sql).all(...this.values) }; }
    async run() { return db.prepare(this.sql).run(...this.values); }
  }
  const d1 = {
    prepare(sql) { return new Statement(sql); },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const cms = new CmsService(new D1CmsStore(d1));
  const worker = createApiWorker(() => cms);
  const env = { DB: d1 };
  const boot = await bootstrapWorker(worker, env);
  const credentialId = await registerPasskey(worker, boot, env);
  const cookies = await login(worker, boot, credentialId, env);
  const session = await worker.fetch(new Request("https://api.test/v1/auth/session", { headers: sessionHeaders(cookies) }), env);
  assert.equal(session.status, 200);
  db.close();
});
