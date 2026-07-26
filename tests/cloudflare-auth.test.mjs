import assert from "node:assert/strict";
import test from "node:test";
import { CmsService, MemoryCmsStore } from "../packages/content-kernel/dist/index.js";
import { normalizeCloudflareAccountId, normalizeCloudflareOwnerEmail } from "../packages/baser-domain/dist/index.js";
import { createApiWorker } from "../apps/api-worker/dist/index.js";

const ACCOUNT = "b96f01ce-30cb-43c6-9ade-fcc14b5bf026";
const ACCOUNT_NORMALIZED = normalizeCloudflareAccountId(ACCOUNT);
const EMAIL = "owner@example.com";

const ACCESS_ENV = {
  CF_ACCESS_REQUIRED: "true",
  CF_ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
  CF_ACCESS_AUDIENCE: "test-audience",
};

function workerWithBoundOwner(cms, workerOptions = {}) {
  return createApiWorker(() => cms, {
    verifyCloudflareAccessJwt: async () => ({ email: EMAIL }),
    ...workerOptions,
  });
}

async function bootstrapOwner(cms) {
  return cms.bootstrap({
    workspaceName: "W",
    siteName: "S",
    hostname: "cf.test",
    ownerName: "Owner",
    cloudflareAccountId: ACCOUNT,
    cloudflareOwnerEmail: EMAIL,
  });
}

test("bootstrap stores Cloudflare owner binding", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await bootstrapOwner(cms);
  const target = await cms.findCloudflareLoginTarget(ACCOUNT_NORMALIZED, normalizeCloudflareOwnerEmail(EMAIL));
  assert.ok(target);
  assert.equal(target.ownerPrincipalId, boot.ownerPrincipalId);
  assert.equal(await cms.hasCloudflareOwnerBinding(), true);
});

test("bindCloudflareOwner normalizes account id and email", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await cms.bootstrap({
    workspaceName: "W",
    siteName: "S",
    hostname: "cf.test",
    ownerName: "Owner",
  });
  await cms.bindCloudflareOwner({
    cloudflareAccountId: ACCOUNT,
    cloudflareOwnerEmail: "Owner@Example.com",
  });
  const target = await cms.findCloudflareLoginTarget(ACCOUNT_NORMALIZED, normalizeCloudflareOwnerEmail(EMAIL));
  assert.ok(target);
});

test("findCloudflareLoginTarget rejects unknown account", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const target = await cms.findCloudflareLoginTarget(
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    normalizeCloudflareOwnerEmail(EMAIL),
  );
  assert.equal(target, null);
});

test("bootstrap rejects partial Cloudflare owner fields", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await assert.rejects(
    () => cms.bootstrap({
      workspaceName: "W",
      siteName: "S",
      hostname: "cf.test",
      ownerName: "Owner",
      cloudflareAccountId: ACCOUNT,
    }),
    (error) => error?.code === "CLOUDFLARE_OWNER_INCOMPLETE",
  );
});

test("cloudflare entry unavailable when owner bound but login not configured", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = createApiWorker(() => cms);
  const res = await worker.fetch(new Request("https://api.test/v1/auth/cloudflare/entry"), {});
  const body = await res.json();
  assert.equal(body.available, false);
  assert.equal(body.reason, "login_not_configured");
});

test("cloudflare entry access mode only when CF_ACCESS_* configured", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = createApiWorker(() => cms);
  const res = await worker.fetch(new Request("https://api.test/v1/auth/cloudflare/entry"), ACCESS_ENV);
  const body = await res.json();
  assert.equal(body.available, true);
  assert.equal(body.mode, "access");
});

test("access login rejects spoofed email without JWT", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = workerWithBoundOwner(cms);
  const res = await worker.fetch(
    new Request("https://api.test/v1/auth/access/login", {
      headers: { "cf-access-authenticated-user-email": EMAIL },
    }),
    ACCESS_ENV,
  );
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location") ?? "", /\/console\/login\?error=/);
});

test("access login rejects without Access configuration", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = workerWithBoundOwner(cms);
  const res = await worker.fetch(
    new Request("https://api.test/v1/auth/access/login", {
      headers: {
        "cf-access-jwt-assertion": "fake",
        "cf-access-authenticated-user-email": EMAIL,
      },
    }),
    {},
  );
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, "ACCESS_LOGIN_DISABLED");
});

test("access login issues session when JWT verifies and email matches owner", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = workerWithBoundOwner(cms);
  const res = await worker.fetch(
    new Request("https://api.test/v1/auth/access/login", {
      headers: {
        "cf-access-jwt-assertion": "test-jwt",
        "cf-access-authenticated-user-email": EMAIL,
      },
    }),
    ACCESS_ENV,
  );
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location") ?? "", /\/console\/login\?oauth=complete/);
  assert.ok(res.headers.get("set-cookie")?.includes("baser_session"));
});

test("cloudflare entry unavailable without owner binding", async () => {
  const worker = createApiWorker();
  const res = await worker.fetch(new Request("https://api.test/v1/auth/cloudflare/entry"), {});
  const body = await res.json();
  assert.equal(body.available, false);
});

test("cloudflare entry oauth mode when OAuth configured and owner bound", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const worker = createApiWorker(() => cms);
  const env = {
    BASER_CF_OAUTH_CLIENT_ID: "client-id",
    BASER_CF_OAUTH_CLIENT_SECRET: "client-secret",
  };
  const res = await worker.fetch(new Request("https://api.test/v1/auth/cloudflare/entry"), env);
  const body = await res.json();
  assert.equal(body.available, true);
  assert.equal(body.mode, "oauth");
});

test("findCloudflareLoginTargetByEmail matches bootstrap owner when account id differs", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  await bootstrapOwner(cms);
  const wrongAccount = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.equal(await cms.findCloudflareLoginTarget(wrongAccount, normalizeCloudflareOwnerEmail(EMAIL)), null);
  const byEmail = await cms.findCloudflareLoginTargetByEmail(normalizeCloudflareOwnerEmail(EMAIL));
  assert.ok(byEmail);
});
