import test from "node:test";
import assert from "node:assert/strict";
import { createApiWorker, createInitialHomepage } from "../apps/api-worker/dist/index.js";
import { createCorsContext, applyCors } from "../apps/api-worker/dist/http/cors.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import {
  BUILTIN_STARTER_HOME_HERO_ASSET_ID,
  collectAssetReferences,
  createBlock,
  createEmptyDocument,
} from "@baser-edge/structured-document";
import { BUILTIN_STARTER_HOME_HERO_PATH } from "../apps/public-renderer/dist/builtin-assets.js";

test("applyCors mirrors localhost and auth-origin allowlist behavior", () => {
  const authOrigin = "https://auth.example.test";
  const localhostContext = createCorsContext(
    new Request("https://api.test/health", { headers: { Origin: "http://localhost:5173" } }),
    authOrigin,
  );
  const localhostResponse = applyCors(new Response(null, { status: 200 }), localhostContext);
  assert.equal(localhostResponse.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(localhostResponse.headers.get("vary"), "Origin");

  const authContext = createCorsContext(
    new Request("https://api.test/health", { headers: { Origin: authOrigin } }),
    authOrigin,
  );
  const authResponse = applyCors(new Response(null, { status: 200 }), authContext);
  assert.equal(authResponse.headers.get("access-control-allow-origin"), authOrigin);

  const otherContext = createCorsContext(
    new Request("https://api.test/health", { headers: { Origin: "https://evil.example" } }),
    authOrigin,
  );
  const otherResponse = applyCors(new Response(null, { status: 200 }), otherContext);
  assert.equal(otherResponse.headers.get("access-control-allow-origin"), "*");
});

test("parallel audit requests keep request-scoped CORS origins", async () => {
  const gates = [];
  class DelayedAuditCms extends CmsService {
    async listAudit(actor, workspaceId) {
      const gate = gates.shift();
      if (gate) await gate.promise;
      return super.listAudit(actor, workspaceId);
    }
  }
  const cms = new DelayedAuditCms(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "CORS",
    siteName: "CORS Site",
    hostname: "cors.test",
    ownerName: "Owner",
  });
  const worker = createApiWorker(() => cms);
  const headers = {
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  let releaseSlow;
  let releaseFast;
  gates.push({
    promise: new Promise((resolve) => {
      releaseSlow = resolve;
    }),
  });
  gates.push({
    promise: new Promise((resolve) => {
      releaseFast = resolve;
    }),
  });
  const slowRequest = worker.fetch(
    new Request(`https://api.test/v1/audit?workspaceId=${boot.workspaceId}`, {
      headers: { ...headers, Origin: "http://localhost:8787" },
    }),
    { BASER_AUTH_ORIGIN: "https://auth.example.test" },
  );
  const fastRequest = worker.fetch(
    new Request(`https://api.test/v1/audit?workspaceId=${boot.workspaceId}`, {
      headers: { ...headers, Origin: "http://127.0.0.1:9999" },
    }),
    { BASER_AUTH_ORIGIN: "https://auth.example.test" },
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  releaseFast();
  const fastResponse = await fastRequest;
  assert.equal(fastResponse.status, 200);
  assert.equal(fastResponse.headers.get("access-control-allow-origin"), "http://127.0.0.1:9999");
  releaseSlow();
  const slowResponse = await slowRequest;
  assert.equal(slowResponse.status, 200);
  assert.equal(slowResponse.headers.get("access-control-allow-origin"), "http://localhost:8787");
});

test("createInitialHomepage seeds starter hero without persisted builtin asset references", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Home",
    siteName: "Flower Shop",
    hostname: "home.test",
    ownerName: "Owner",
  });
  await createInitialHomepage(cms, {
    siteId: boot.siteId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteName: "Flower Shop",
  });
  const home = await cms.findPublicByPath(boot.siteId, "/home");
  assert.ok(home?.publishedRevision);
  const document = home.publishedRevision.document;
  assert.equal(collectAssetReferences(document).length, 0);
  const imageBlock = document.root.slots.body?.find((block) => block.type === "image");
  assert.equal(imageBlock?.props.assetId, BUILTIN_STARTER_HOME_HERO_ASSET_ID);
  const headings = document.root.slots.body?.filter((block) => block.type === "heading") ?? [];
  assert.ok(headings.some((block) => block.props.text === "私たちについて"));
});

test("createInitialHomepage does not overwrite an existing /home", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Existing",
    siteName: "Existing",
    hostname: "existing.test",
    ownerName: "Owner",
  });
  await createInitialHomepage(cms, {
    siteId: boot.siteId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteName: "First",
  });
  const before = await cms.findPublicByPath(boot.siteId, "/home");
  await createInitialHomepage(cms, {
    siteId: boot.siteId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteName: "Second",
  });
  const after = await cms.findPublicByPath(boot.siteId, "/home");
  assert.equal(after?.publishedRevision?.id, before?.publishedRevision?.id);
});

test("public renderer serves builtin starter hero and rejects unknown builtin paths", async () => {
  const worker = createPublicWorker();
  const getResponse = await worker.fetch(new Request(`https://renderer.test${BUILTIN_STARTER_HOME_HERO_PATH}`), {});
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers.get("content-type"), "image/webp");
  assert.equal(getResponse.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.ok(getResponse.headers.get("etag"));
  assert.equal(getResponse.headers.get("x-content-type-options"), "nosniff");
  const heroBytes = await getResponse.arrayBuffer();
  assert.ok(heroBytes.byteLength > 0);

  const headResponse = await worker.fetch(
    new Request(`https://renderer.test${BUILTIN_STARTER_HOME_HERO_PATH}`, { method: "HEAD" }),
    {},
  );
  assert.equal(headResponse.status, 200);
  assert.equal(headResponse.body, null);

  const unknown = await worker.fetch(new Request("https://renderer.test/__baser/builtin-assets/other.webp"), {});
  assert.equal(unknown.status, 404);

  const byAssetId = await worker.fetch(
    new Request(`https://renderer.test/assets/${encodeURIComponent(BUILTIN_STARTER_HOME_HERO_ASSET_ID)}`),
    {},
  );
  assert.equal(byAssetId.status, 200);
  assert.equal(byAssetId.headers.get("content-type"), "image/webp");
});

test("published /home HTML references builtin hero image without R2", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({
    workspaceName: "Renderer Home",
    siteName: "Renderer Site",
    hostname: "renderer-home.test",
    ownerName: "Owner",
  });
  await createInitialHomepage(cms, {
    siteId: boot.siteId,
    ownerPrincipalId: boot.ownerPrincipalId,
    siteName: "Renderer Site",
  });
  const worker = createPublicWorker(() => cms);
  const pageResponse = await worker.fetch(new Request("https://renderer-home.test/home"), {
    SITE_ID: boot.siteId,
  });
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, new RegExp(BUILTIN_STARTER_HOME_HERO_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /店内に飾られた花々のサンプル画像/);
});

test("collectAssetReferences ignores embedded builtin starter hero id", () => {
  const document = createEmptyDocument();
  document.root.slots.body?.push(
    createBlock("image", { assetId: BUILTIN_STARTER_HOME_HERO_ASSET_ID, alt: "sample" }),
    createBlock("image", { assetId: "asset_real", alt: "real" }),
  );
  const references = collectAssetReferences(document);
  assert.equal(references.length, 1);
  assert.equal(references[0].assetId, "asset_real");
});
