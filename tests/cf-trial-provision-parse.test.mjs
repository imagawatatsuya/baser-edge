import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIGRATION_STATEMENTS_PER_INVOCATION,
  TRIAL_PROVISION_STEP_EXTERNAL_SUBREQUEST_CEILING,
  TRIAL_PROVISION_UI_STEPS,
  baserEdgeSchemaReady,
  decryptTrialProvisionToken,
  encryptTrialProvisionToken,
  expectedMigrationSchemaObjects,
  ensureD1Database,
  parseConsoleUrlFromLog,
  parseTrialProvisionQueueMessage,
  parseWorkerSubdomainUrl,
  runTrialMigrationChunk,
  runTrialProvisionReleaseStep,
  trialMigrationRunnerSource,
  trialProvisionStageProgress,
  assertTrialHostCmsOAuth,
  verifyTrialCmsLoginReady,
} from "../packages/cf-trial-provision/dist/index.js";
import {
  uploadWorkerAssets,
  waitForWorkersDevRoute,
  workerAssetContentType,
} from "../packages/cf-trial-provision/dist/deploy-worker.js";

async function loadMigrationRunnerModule() {
  if (typeof globalThis.crypto.subtle.timingSafeEqual !== "function") {
    Object.defineProperty(globalThis.crypto.subtle, "timingSafeEqual", {
      configurable: true,
      value(left, right) {
        const a = new Uint8Array(left.buffer ?? left, left.byteOffset ?? 0, left.byteLength);
        const b = new Uint8Array(right.buffer ?? right, right.byteOffset ?? 0, right.byteLength);
        if (a.byteLength !== b.byteLength) return false;
        let difference = 0;
        for (let index = 0; index < a.byteLength; index += 1) {
          difference |= a[index] ^ b[index];
        }
        return difference === 0;
      },
    });
  }
  const encoded = Buffer.from(trialMigrationRunnerSource(), "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}#${crypto.randomUUID()}`);
}

describe("cf-trial-provision log parse", () => {
  it("uploads Worker assets with browser-renderable content types", async () => {
    assert.equal(workerAssetContentType("/index.html"), "text/html; charset=utf-8");
    assert.equal(workerAssetContentType("/assets/app.js"), "text/javascript; charset=utf-8");
    assert.equal(workerAssetContentType("/assets/app.css"), "text/css; charset=utf-8");
    assert.equal(workerAssetContentType("/download.bin"), "application/octet-stream");

    const originalFetch = globalThis.fetch;
    const uploadedTypes = new Map();
    const manifest = {
      "/index.html": { hash: "html-hash", size: 15 },
      "/assets/app.js": { hash: "js-hash", size: 17 },
      "/assets/app.css": { hash: "css-hash", size: 16 },
    };
    try {
      globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        if (request.url.endsWith("/assets-upload-session")) {
          return Response.json({
            success: true,
            result: {
              jwt: "upload-jwt",
              buckets: [["html-hash", "js-hash", "css-hash"]],
            },
          });
        }
        if (request.url.includes("/workers/assets/upload?base64=true")) {
          const form = await request.formData();
          for (const hash of ["html-hash", "js-hash", "css-hash"]) {
            uploadedTypes.set(hash, form.get(hash)?.type);
          }
          return Response.json({
            success: true,
            result: { jwt: "completion-jwt" },
          });
        }
        throw new Error(`Unexpected fetch: ${request.method} ${request.url}`);
      };

      const completionJwt = await uploadWorkerAssets(
        "token",
        "account",
        "script",
        manifest,
        async (manifestPath) => new TextEncoder().encode(manifestPath).buffer,
        { spend() {} },
      );

      assert.equal(completionJwt, "completion-jwt");
      assert.equal(uploadedTypes.get("html-hash"), "text/html; charset=utf-8");
      assert.equal(uploadedTypes.get("js-hash"), "text/javascript; charset=utf-8");
      assert.equal(uploadedTypes.get("css-hash"), "text/css; charset=utf-8");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses console URL from build log", () => {
    const log = "管理画面: https://baser-edge-api-trial.foo.workers.dev/console/\n";
    assert.equal(parseConsoleUrlFromLog(log), "https://baser-edge-api-trial.foo.workers.dev/console/");
  });

  it("parses worker subdomain", () => {
    const log = "Deployed https://baser-edge-public-trial.bar.workers.dev\n";
    assert.equal(parseWorkerSubdomainUrl(log, "baser-edge-public-trial"), "https://baser-edge-public-trial.bar.workers.dev");
  });

  it("keeps each bound Migration Worker invocation below the Queue API budget", () => {
    assert.ok(MIGRATION_STATEMENTS_PER_INVOCATION > 0);
    assert.ok(MIGRATION_STATEMENTS_PER_INVOCATION <= 30);
  });

  it("chains the Cloudflare-only release flow with every invocation below 50 external subrequests", async () => {
    assert.ok(TRIAL_PROVISION_STEP_EXTERNAL_SUBREQUEST_CEILING < 50);
    const originalFetch = globalThis.fetch;
    let invocationCalls = 0;
    const callsByStage = [];
    const bulkSecretRequests = [];
    const workerUploadMetadata = [];
    const d1Sql = [];
    const migrationWorkerChunks = [];
    let migrationWorkerCalls = 0;
    let assetSessionCount = 0;
    const migrations = [{
      name: "0001.sql",
      statements: Array.from(
        { length: 45 },
        (_, index) => `CREATE TABLE trial_${index} (id TEXT PRIMARY KEY);`,
      ),
    }];
    const manifest = {
      version: "test",
      d1DatabaseName: "baser-edge-trial",
      apiWorkerName: "baser-edge-api-trial",
      publicWorkerName: "baser-edge-public-trial",
      apiModule: "api-index.js",
      publicModule: "public-index.js",
      adminAssets: {
        "/assets/admin.js": { hash: "admin-js", size: 21 },
      },
      migrations,
    };
    const releaseFetch = async (input) => {
      const pathname = new URL(input instanceof Request ? input.url : input).pathname;
      if (pathname.endsWith("/manifest.json")) return Response.json(manifest);
      if (pathname.endsWith("/api-index.js") || pathname.endsWith("/public-index.js")) {
        return new Response("export default { fetch(){ return new Response('ok') } }");
      }
      return new Response(new Uint8Array());
    };
    globalThis.fetch = async (input, init) => {
      invocationCalls += 1;
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      const method = request.method;

      if (url.hostname === "api.cloudflare.com") {
        if (url.pathname.endsWith("/secrets-bulk")) {
          bulkSecretRequests.push({
            method,
            body: await request.json(),
          });
          return Response.json({ success: true, result: {} });
        }
        if (/\/workers\/scripts\/[^/]+$/.test(url.pathname) && method === "PUT") {
          const form = await request.formData();
          const metadataPart = form.get("metadata");
          workerUploadMetadata.push({
            scriptName: decodeURIComponent(url.pathname.split("/").at(-1)),
            metadata: JSON.parse(await metadataPart.text()),
          });
          return Response.json({ success: true, result: {} });
        }
        if (url.pathname.endsWith("/d1/database") && method === "GET") {
          return Response.json({ success: true, result: [] });
        }
        if (url.pathname.endsWith("/d1/database") && method === "POST") {
          return Response.json({ success: true, result: { uuid: "d".repeat(32) } });
        }
        if (url.pathname.endsWith("/query")) {
          const body = await request.json();
          d1Sql.push(body.sql);
          return Response.json({ success: true, result: [{ success: true, results: [] }] });
        }
        if (url.pathname.endsWith("/workers/subdomain")) {
          return Response.json({ success: true, result: { subdomain: "trial-account" } });
        }
        if (url.pathname.includes("/assets-upload-session")) {
          assetSessionCount += 1;
          return Response.json({
            success: true,
            result: { jwt: `assets-jwt-${assetSessionCount}`, buckets: [] },
          });
        }
        if (url.pathname.endsWith("/subdomain")) {
          return Response.json({ success: true, result: { enabled: true } });
        }
        if (url.pathname === "/client/v4/user") {
          return Response.json({ success: true, result: { email: "owner@example.com" } });
        }
        if (url.pathname === "/client/v4/accounts") {
          return Response.json({ success: true, result: [{ id: "a".repeat(32) }] });
        }
        return Response.json({ success: true, result: {} });
      }
      if (url.hostname.startsWith("baser-edge-trial-migrate.")) {
        if (method === "GET") {
          return Response.json({ ok: true, service: "baser-edge-trial-migrate" });
        }
        migrationWorkerCalls += 1;
        const body = await request.json();
        migrationWorkerChunks.push(body.statements);
        return Response.json({ ok: true, applied: body.statements.length, skipped: 0 });
      }
      if (url.pathname === "/v1/bootstrap") {
        return Response.json({
          workspaceId: "ws_test",
          siteId: "site_test",
          ownerPrincipalId: "prn_test",
        }, { status: 201 });
      }
      if (url.pathname === "/v1/bootstrap/ready") {
        return Response.json({ ready: true });
      }
      if (url.pathname === "/v1/auth/cloudflare/entry") {
        return Response.json({ available: true, mode: "oauth" });
      }
      if (url.pathname === "/health") return Response.json({ ok: true });
      if (url.pathname === "/console/") {
        return new Response("<!doctype html><title>baserEdge</title>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      throw new Error(`Unexpected external fetch: ${method} ${url}`);
    };

    const trialConfig = {
      accountId: "a".repeat(32),
      releaseBaseUrl: "https://release.test/trial-release",
      httpFetch: releaseFetch,
      cmsOAuth: {
        clientId: "trial-oauth-client",
        clientSecret: "trial-oauth-secret",
        redirectUri: "https://trial-host.test/api/cms-oauth/callback",
      },
    };
    try {
      let state;
      let completed;
      let replayedApiInitial = false;
      for (let invocation = 0; invocation < 20; invocation += 1) {
        invocationCalls = 0;
        const stage = state?.stage ?? "prepare";
        let result = await runTrialProvisionReleaseStep(
          "oauth-token",
          trialConfig,
          state,
        );
        callsByStage.push({ stage, calls: invocationCalls });
        assert.ok(invocationCalls < 50, `${stage} made ${invocationCalls} external subrequests`);
        if (stage === "deploy-api-initial" && !replayedApiInitial) {
          replayedApiInitial = true;
          invocationCalls = 0;
          result = await runTrialProvisionReleaseStep(
            "oauth-token",
            trialConfig,
            state,
          );
          callsByStage.push({ stage: "deploy-api-initial-redelivery", calls: invocationCalls });
          assert.ok(
            invocationCalls < 50,
            `deploy-api-initial redelivery made ${invocationCalls} external subrequests`,
          );
        }
        if (result.done) {
          completed = result;
          break;
        }
        state = result.state;
      }
      assert.equal(completed?.result.consoleUrl, "https://baser-edge-api-trial.trial-account.workers.dev/console/");
      assert.deepEqual(callsByStage.map(({ stage }) => stage), [
        "prepare",
        "prepare-migrations",
        "migrate",
        "migrate",
        "cleanup-migrations",
        "upload-assets",
        "deploy-public-initial",
        "deploy-api-initial",
        "deploy-api-initial-redelivery",
        "secrets",
        "verify-bootstrap-secret",
        "bootstrap",
        "deploy-public-final",
        "deploy-api-final",
      ]);
      assert.ok(Math.max(...callsByStage.map(({ calls }) => calls)) < 50);
      assert.equal(bulkSecretRequests.length, 3);
      assert.deepEqual(bulkSecretRequests.map(({ method }) => method), ["PATCH", "PATCH", "PATCH"]);
      assert.deepEqual(
        Object.keys(bulkSecretRequests[0].body.secrets),
        ["MIGRATE_RUNNER_SECRET"],
      );
      assert.deepEqual(
        Object.keys(bulkSecretRequests[1].body.secrets).sort(),
        [
          "ASSET_UPLOAD_SECRET",
          "BASER_BOOTSTRAP_SECRET",
          "BASER_CF_OAUTH_CLIENT_ID",
          "BASER_CF_OAUTH_CLIENT_SECRET",
          "BASER_CF_OAUTH_REDIRECT_URI",
          "MAIL_FORM_SECRET",
          "MAIL_PRIVACY_SALT",
          "PREVIEW_SECRET",
        ],
      );
      assert.deepEqual(
        Object.keys(bulkSecretRequests[2].body.secrets).sort(),
        ["MAIL_FORM_SECRET", "MAIL_PRIVACY_SALT", "PREVIEW_SECRET"],
      );
      assert.ok(
        workerUploadMetadata.every(
          ({ metadata }) => metadata.keep_bindings.includes("secret_text")
            && metadata.keep_bindings.includes("secret_key"),
        ),
      );
      const apiUploads = workerUploadMetadata
        .filter(({ scriptName }) => scriptName === "baser-edge-api-trial")
        .map(({ metadata }) => metadata);
      assert.equal(assetSessionCount, 3);
      assert.equal(apiUploads.length, 3);
      assert.equal(apiUploads[0].assets.jwt, "assets-jwt-2");
      assert.deepEqual(apiUploads[0].assets.config.run_worker_first, ["/", "/health", "/v1/*", "/console"]);
      assert.deepEqual(
        apiUploads[0].bindings.find(({ type }) => type === "assets"),
        { type: "assets", name: "STATIC_ASSETS" },
      );
      assert.equal(apiUploads[0].keep_assets, undefined);
      assert.equal(apiUploads[1].assets.jwt, "assets-jwt-3");
      assert.notEqual(apiUploads[1].assets.jwt, apiUploads[0].assets.jwt);
      assert.deepEqual(apiUploads[1].assets.config.run_worker_first, ["/", "/health", "/v1/*", "/console"]);
      assert.equal(apiUploads[1].keep_assets, undefined);
      assert.equal(apiUploads[2].assets, undefined);
      assert.equal(apiUploads[2].keep_assets, true);
      assert.deepEqual(
        apiUploads[2].bindings.find(({ type }) => type === "assets"),
        { type: "assets", name: "STATIC_ASSETS" },
      );
      assert.equal(migrationWorkerCalls, 2);
      assert.deepEqual(migrationWorkerChunks.map((chunk) => chunk.length), [30, 17]);
      assert.ok(migrationWorkerChunks.flat().some((sql) => sql.startsWith("CREATE TABLE trial_0")));
      assert.ok(
        migrationWorkerChunks.flat().some((sql) => sql.includes("INSERT OR IGNORE INTO d1_migrations")),
      );
      assert.equal(
        workerUploadMetadata.some(({ scriptName }) => scriptName === "baser-edge-trial-migrate"),
        true,
      );
      assert.equal(d1Sql.length, 1);
      assert.match(d1Sql[0], /sqlite_master/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps every Queue state to the same ordered steps shown in the onboarding UI", () => {
    assert.deepEqual(
      TRIAL_PROVISION_UI_STEPS.map(({ id }) => id),
      [
        "connect",
        "provision",
        "migrate",
        "assets",
        "deploy-public",
        "deploy-api",
        "secrets",
        "bootstrap",
        "finalize",
        "succeeded",
      ],
    );
    assert.deepEqual(
      [
        "prepare",
        "prepare-migrations",
        "migrate",
        "cleanup-migrations",
        "upload-assets",
        "deploy-public-initial",
        "deploy-api-initial",
        "secrets",
        "verify-bootstrap-secret",
        "bootstrap",
        "deploy-public-final",
        "deploy-api-final",
      ].map((stage) => trialProvisionStageProgress(stage).step),
      [
        "provision",
        "migrate",
        "migrate",
        "migrate",
        "assets",
        "deploy-public",
        "deploy-api",
        "secrets",
        "secrets",
        "bootstrap",
        "finalize",
        "finalize",
      ],
    );
  });

  it("tracks every named table, index and trigger required by a migration pack", () => {
    const objects = expectedMigrationSchemaObjects([{
      name: "0001.sql",
      statements: [
        "CREATE TABLE workspaces (id TEXT PRIMARY KEY);",
        "CREATE UNIQUE INDEX uq_workspaces_name ON workspaces(id);",
        "CREATE TRIGGER validate_workspace BEFORE INSERT ON workspaces BEGIN SELECT 1; END;",
        "CREATE VIRTUAL TABLE workspace_search USING fts5(name);",
      ],
    }]);
    assert.deepEqual(objects, [
      { type: "table", name: "workspaces" },
      { type: "index", name: "uq_workspaces_name" },
      { type: "trigger", name: "validate_workspace" },
      { type: "table", name: "workspace_search" },
    ]);
  });

  it("does not accept the legacy three-table sentinel when another migration object is missing", async () => {
    const originalFetch = globalThis.fetch;
    const migrations = [{
      name: "0001.sql",
      statements: [
        "CREATE TABLE workspaces (id TEXT PRIMARY KEY);",
        "CREATE TABLE auth_sessions (id TEXT PRIMARY KEY);",
        "CREATE TABLE theme_releases (id TEXT PRIMARY KEY);",
        "CREATE TABLE content_types (id TEXT PRIMARY KEY);",
        "CREATE INDEX idx_content_types ON content_types(id);",
      ],
    }];
    globalThis.fetch = async (_url, init) => {
      const sql = JSON.parse(init.body).sql;
      assert.match(sql, /content_types/);
      return Response.json({
        success: true,
        result: [{
          results: [
            { type: "table", name: "workspaces" },
            { type: "table", name: "auth_sessions" },
            { type: "table", name: "theme_releases" },
          ],
        }],
      });
    };
    try {
      assert.equal(
        await baserEdgeSchemaReady("token", "account", "database", migrations, { spend() {} }),
        false,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("executes a complete CREATE TRIGGER through the deployed runner source", async () => {
    const { default: runnerWorker } = await loadMigrationRunnerModule();
    const sqlCalls = [];
    const triggerSql =
      "CREATE TRIGGER validate_workspace BEFORE INSERT ON workspaces BEGIN SELECT 1; END;";
    const env = {
      MIGRATE_RUNNER_SECRET: "runner-secret",
      DB: {
        prepare(sql) {
          sqlCalls.push(sql);
          return {
            async run() {
              if (sql.includes("duplicate_table")) throw new Error("table duplicate_table already exists");
              return { success: true };
            },
          };
        },
      },
    };
    const response = await runnerWorker.fetch(
      new Request("https://runner.test/", {
        method: "POST",
        headers: {
          Authorization: "Bearer runner-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          statements: [
            triggerSql,
            "CREATE TABLE duplicate_table (id TEXT PRIMARY KEY);",
          ],
        }),
      }),
      env,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, applied: 1, skipped: 1 });
    assert.deepEqual(sqlCalls, [
      triggerSql,
      "CREATE TABLE duplicate_table (id TEXT PRIMARY KEY);",
    ]);
  });

  it("rejects unauthenticated Migration Worker requests before D1 access", async () => {
    const { default: runnerWorker } = await loadMigrationRunnerModule();
    let prepared = false;
    const response = await runnerWorker.fetch(
      new Request("https://runner.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statements: ["SELECT 1;"] }),
      }),
      {
        MIGRATE_RUNNER_SECRET: "runner-secret",
        DB: {
          prepare() {
            prepared = true;
            throw new Error("must not execute");
          },
        },
      },
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, code: "UNAUTHORIZED" });
    assert.equal(prepared, false);
  });

  it("rejects oversized Migration Worker chunks before D1 access", async () => {
    const { default: runnerWorker } = await loadMigrationRunnerModule();
    let prepared = false;
    const response = await runnerWorker.fetch(
      new Request("https://runner.test/", {
        method: "POST",
        headers: {
          Authorization: "Bearer runner-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          statements: Array.from(
            { length: MIGRATION_STATEMENTS_PER_INVOCATION + 1 },
            () => "SELECT 1;",
          ),
        }),
      }),
      {
        MIGRATE_RUNNER_SECRET: "runner-secret",
        DB: {
          prepare() {
            prepared = true;
            throw new Error("must not execute");
          },
        },
      },
    );
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { ok: false, code: "TOO_MANY_STATEMENTS" });
    assert.equal(prepared, false);
  });

  it("sends a complete trigger to the bound Migration Worker in one chunk", async () => {
    const originalFetch = globalThis.fetch;
    const chunks = [];
    globalThis.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const body = await request.json();
      chunks.push(body.statements);
      assert.equal(request.headers.get("Authorization"), "Bearer runner-secret");
      return Response.json({ ok: true, applied: body.statements.length, skipped: 0 });
    };

    const triggerSql =
      "CREATE TRIGGER validate_workspace BEFORE INSERT ON workspaces BEGIN SELECT 1; END;";
    try {
      const result = await runTrialMigrationChunk(
        "token",
        "account",
        "database",
        {
          mode: "full",
          url: "https://baser-edge-trial-migrate.example.workers.dev",
          secret: "runner-secret",
        },
        [{
          name: "0001.sql",
          statements: [
            "CREATE TABLE workspaces (id TEXT PRIMARY KEY);",
            triggerSql,
          ],
        }],
        0,
        { spend() {} },
      );
      assert.deepEqual(result, { nextCursor: 4, done: true });
      assert.equal(chunks.length, 1);
      assert.equal(chunks[0][2], triggerSql);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports the bound Migration Worker statement failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json(
        {
          ok: false,
          code: "MIGRATION_STATEMENT_FAILED",
          error: "D1_ERROR: constraint failed",
          statementIndex: 0,
        },
        { status: 500 },
      );
    try {
      await assert.rejects(
        runTrialMigrationChunk(
          "token",
          "account",
          "database",
          {
            mode: "full",
            url: "https://baser-edge-trial-migrate.example.workers.dev",
            secret: "runner-secret",
          },
          [{ name: "0001.sql", statements: ["CREATE TABLE broken (id TEXT);"] }],
          0,
          { spend() {} },
        ),
        /constraint failed/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps polling when workers.dev propagation takes longer than the old retry window", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    let attempts = 0;

    globalThis.fetch = async () => {
      attempts += 1;
      return new Response("", { status: attempts <= 8 ? 404 : 200 });
    };
    globalThis.setTimeout = (callback) => {
      queueMicrotask(callback);
      return 0;
    };

    try {
      await waitForWorkersDevRoute("https://trial.example.workers.dev/");
      assert.equal(attempts, 9);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("does not accept an authenticated-route 401 as workers.dev readiness", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("", { status: 401 });
    try {
      await assert.rejects(
        waitForWorkersDevRoute("https://trial.example.workers.dev/", {
          maxAttempts: 1,
          delayMs: 0,
        }),
        /status=401/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not accept a console redirect as workers.dev readiness", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, {
      status: 302,
      headers: { location: "/" },
    });
    try {
      await assert.rejects(
        waitForWorkersDevRoute("https://trial.example.workers.dev/console/", {
          maxAttempts: 1,
          delayMs: 0,
          expectedContentTypePrefix: "text/html",
        }),
        /status=302/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not accept the SPA HTML fallback as a JavaScript asset", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("<!doctype html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    try {
      await assert.rejects(
        waitForWorkersDevRoute("https://trial.example.workers.dev/console/assets/admin.js", {
          maxAttempts: 1,
          delayMs: 0,
          expectedContentTypePrefix: "text/javascript",
        }),
        /content-type=text\/html/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("accepts a valid encrypted trial provision queue message", () => {
    const body = {
      version: 1,
      sessionId: "a".repeat(24),
      accountId: "b".repeat(32),
      requestOrigin: "https://baser-edge-trial-host.example.workers.dev",
      encryptedApiToken: "c".repeat(64),
    };
    assert.deepEqual(parseTrialProvisionQueueMessage(body), body);
  });

  it("accepts a closed D1 location hint and rejects wrong type or unknown values", () => {
    const body = {
      version: 1,
      sessionId: "a".repeat(24),
      accountId: "b".repeat(32),
      requestOrigin: "https://baser-edge-trial-host.example.workers.dev",
      encryptedApiToken: "c".repeat(64),
      d1PrimaryLocationHint: "apac",
    };
    assert.deepEqual(parseTrialProvisionQueueMessage(body), body);
    assert.throws(
      () => parseTrialProvisionQueueMessage({ ...body, d1PrimaryLocationHint: 1 }),
      (error) => error?.code === "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE",
    );
    assert.throws(
      () => parseTrialProvisionQueueMessage({ ...body, d1PrimaryLocationHint: "asia" }),
      (error) => error?.code === "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE",
    );
  });

  it("creates nearby replicated D1 and upgrades an existing non-replicated D1", async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    try {
      globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requests.push({
          method: request.method,
          url: request.url,
          body: request.method === "GET" ? null : await request.clone().json(),
        });
        if (request.method === "GET") {
          return Response.json({ success: true, result: [] });
        }
        return Response.json({ success: true, result: { uuid: "new-db" } });
      };
      assert.equal(
        await ensureD1Database("token", "account", { spend() {} }, { primaryLocationHint: "apac" }),
        "new-db",
      );
      assert.deepEqual(requests[1].body, {
        name: "baser-edge-trial",
        primary_location_hint: "apac",
        read_replication: { mode: "auto" },
      });

      requests.length = 0;
      globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requests.push({
          method: request.method,
          url: request.url,
          body: request.method === "GET" ? null : await request.clone().json(),
        });
        if (request.method === "GET") {
          return Response.json({
            success: true,
            result: [{
              uuid: "existing-db",
              name: "baser-edge-trial",
              read_replication: { mode: "disabled" },
            }],
          });
        }
        return Response.json({ success: true, result: { uuid: "existing-db" } });
      };
      assert.equal(
        await ensureD1Database("token", "account", { spend() {} }),
        "existing-db",
      );
      assert.equal(requests[1].method, "PUT");
      assert.deepEqual(requests[1].body, { read_replication: { mode: "auto" } });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("accepts encrypted resumable state and rejects malformed state", () => {
    const body = {
      version: 1,
      sessionId: "a".repeat(24),
      accountId: "b".repeat(32),
      requestOrigin: "https://baser-edge-trial-host.example.workers.dev",
      encryptedApiToken: "c".repeat(64),
      encryptedState: "d".repeat(64),
    };
    assert.deepEqual(parseTrialProvisionQueueMessage(body), body);
    assert.throws(
      () => parseTrialProvisionQueueMessage({ ...body, encryptedState: "../state" }),
      (error) => error?.code === "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE",
    );
  });

  it("rejects a queue message with an invalid session id", () => {
    assert.throws(
      () => parseTrialProvisionQueueMessage({
        version: 1,
        sessionId: "../session",
        accountId: "b".repeat(32),
        requestOrigin: "https://baser-edge-trial-host.example.workers.dev",
        encryptedApiToken: "c".repeat(64),
      }),
      (error) => error?.code === "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE",
    );
  });

  it("rejects a queue message with a non-HTTPS origin", () => {
    assert.throws(
      () => parseTrialProvisionQueueMessage({
        version: 1,
        sessionId: "a".repeat(24),
        accountId: "b".repeat(32),
        requestOrigin: "http://attacker.example",
        encryptedApiToken: "c".repeat(64),
      }),
      (error) => error?.code === "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE",
    );
  });

  it("roundtrips the encrypted API token used by the Queue", async () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const encrypted = await encryptTrialProvisionToken(key, "cloudflare-oauth-token");
    assert.notEqual(encrypted, "cloudflare-oauth-token");
    assert.equal(await decryptTrialProvisionToken(key, encrypted), "cloudflare-oauth-token");
  });
});

describe("trial CMS login readiness", () => {
  it("requires host CMS OAuth before pushing user worker secrets", () => {
    assert.throws(() => assertTrialHostCmsOAuth({ accountId: "a", releaseBaseUrl: "https://x" }), /OAuth/);
    assert.doesNotThrow(() => assertTrialHostCmsOAuth({
      accountId: "a",
      releaseBaseUrl: "https://x",
      cmsOAuth: {
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://trial.test/api/cms-oauth/callback",
      },
    }));
  });

  it("verifyTrialCmsLoginReady rejects unavailable entry", async () => {
    await assert.rejects(
      () => verifyTrialCmsLoginReady("https://api.test", async () => new Response(JSON.stringify({ available: false, reason: "owner_not_bound" }))),
      /利用できません/,
    );
  });

  it("verifyTrialCmsLoginReady accepts oauth entry", async () => {
    await verifyTrialCmsLoginReady("https://api.test", async () => new Response(JSON.stringify({ available: true, mode: "oauth" })));
  });
});
