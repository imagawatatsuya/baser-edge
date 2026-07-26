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
  parseConsoleUrlFromLog,
  parseTrialProvisionQueueMessage,
  parseWorkerSubdomainUrl,
  runTrialMigrationChunk,
  runTrialProvisionReleaseStep,
  trialProvisionStageProgress,
} from "../packages/cf-trial-provision/dist/index.js";
import {
  uploadWorkerAssets,
  waitForWorkersDevRoute,
  workerAssetContentType,
} from "../packages/cf-trial-provision/dist/deploy-worker.js";

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

  it("keeps each direct D1 migration stage below the Queue API budget", () => {
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
      adminAssets: {},
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
        return Response.json({ success: true, result: {} });
      }
      if (url.hostname.startsWith("baser-edge-trial-migrate.")) {
        migrationWorkerCalls += 1;
        return Response.json({ ok: true, applied: 40 });
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
      if (url.pathname === "/health") return Response.json({ ok: true });
      throw new Error(`Unexpected external fetch: ${method} ${url}`);
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
          {
            accountId: "a".repeat(32),
            releaseBaseUrl: "https://release.test/trial-release",
            httpFetch: releaseFetch,
          },
          state,
        );
        callsByStage.push({ stage, calls: invocationCalls });
        assert.ok(invocationCalls < 50, `${stage} made ${invocationCalls} external subrequests`);
        if (stage === "deploy-api-initial" && !replayedApiInitial) {
          replayedApiInitial = true;
          invocationCalls = 0;
          result = await runTrialProvisionReleaseStep(
            "oauth-token",
            {
              accountId: "a".repeat(32),
              releaseBaseUrl: "https://release.test/trial-release",
              httpFetch: releaseFetch,
            },
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
      assert.equal(bulkSecretRequests.length, 2);
      assert.deepEqual(bulkSecretRequests.map(({ method }) => method), ["PATCH", "PATCH"]);
      assert.deepEqual(
        Object.keys(bulkSecretRequests[0].body.secrets).sort(),
        [
          "ASSET_UPLOAD_SECRET",
          "BASER_BOOTSTRAP_SECRET",
          "MAIL_FORM_SECRET",
          "MAIL_PRIVACY_SALT",
          "PREVIEW_SECRET",
        ],
      );
      assert.deepEqual(
        Object.keys(bulkSecretRequests[1].body.secrets).sort(),
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
      assert.equal(apiUploads[0].keep_assets, undefined);
      assert.equal(apiUploads[1].assets.jwt, "assets-jwt-3");
      assert.notEqual(apiUploads[1].assets.jwt, apiUploads[0].assets.jwt);
      assert.equal(apiUploads[1].keep_assets, undefined);
      assert.equal(apiUploads[2].assets, undefined);
      assert.equal(apiUploads[2].keep_assets, true);
      assert.equal(migrationWorkerCalls, 0);
      assert.equal(
        workerUploadMetadata.some(({ scriptName }) => scriptName === "baser-edge-trial-migrate"),
        false,
      );
      assert.ok(d1Sql.some((sql) => sql.startsWith("CREATE TABLE trial_0")));
      assert.ok(d1Sql.some((sql) => sql.includes("INSERT OR IGNORE INTO d1_migrations")));
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

  it("applies already-split trigger SQL directly to D1 and resumes past existing objects", async () => {
    const originalFetch = globalThis.fetch;
    const sqlCalls = [];
    globalThis.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const body = await request.json();
      sqlCalls.push(body.sql);
      if (sqlCalls.length === 2) {
        return Response.json(
          {
            success: false,
            errors: [{ code: 7500, message: "table workspaces already exists" }],
          },
          { status: 400 },
        );
      }
      return Response.json({ success: true, result: [{ success: true, results: [] }] });
    };

    const triggerSql =
      "CREATE TRIGGER validate_workspace BEFORE INSERT ON workspaces BEGIN SELECT 1; END;";
    try {
      const result = await runTrialMigrationChunk(
        "token",
        "account",
        "database",
        { mode: "full" },
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
      assert.equal(sqlCalls[2], triggerSql);
      assert.equal(sqlCalls.some((sql) => sql.includes("baser-edge-trial-migrate")), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails direct D1 migration on a non-idempotent SQL error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      Response.json(
        {
          success: false,
          errors: [{ code: 7500, message: "D1_ERROR: incomplete input" }],
        },
        { status: 400 },
      );
    try {
      await assert.rejects(
        runTrialMigrationChunk(
          "token",
          "account",
          "database",
          { mode: "full" },
          [{ name: "0001.sql", statements: ["CREATE TABLE broken (id TEXT);"] }],
          0,
          { spend() {} },
        ),
        /incomplete input/,
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
      return new Response("", { status: attempts <= 8 ? 404 : 405 });
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
