/**
 * 管理画面 (/console/) が想定する API 契約のゴールデンパス。
 * 記事: 空本文で初回公開 → 本文追記して保存 → 再公開 → 公開 HTML に本文が含まれる。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";
import { BlogService, MemoryBlogStore } from "@baser-edge/blog-kernel";
import {
  buildTestAuthenticationResponse,
  buildTestRegistrationResponse,
  CSRF_HEADER,
} from "@baser-edge/auth-kernel";

function simpleDocument(title, body) {
  return {
    formatVersion: 1,
    root: {
      id: "root",
      type: "page",
      componentVersion: 1,
      props: {},
      slots: {
        body: [
          {
            id: "heading",
            type: "heading",
            componentVersion: 1,
            props: { level: 1, text: title },
            slots: {},
          },
          {
            id: "body",
            type: "richText",
            componentVersion: 1,
            props: { paragraphs: body ? [body] : [""] },
            slots: {},
          },
        ],
      },
    },
  };
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

function sessionHeaders(cookies, { csrf = false } = {}) {
  const headers = {
    cookie: `baser_session=${cookies.get("baser_session")}; baser_csrf=${cookies.get("baser_csrf")}`,
    "content-type": "application/json",
  };
  if (csrf) headers[CSRF_HEADER] = cookies.get("baser_csrf");
  return headers;
}

async function bootstrapWorker(worker) {
  const env = {};
  const response = await worker.fetch(new Request("https://api.test/v1/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceName: "Console",
      siteName: "ローカルサイト",
      hostname: "console-golden.test",
      ownerName: "Owner",
    }),
  }), env);
  assert.equal(response.status, 201);
  return response.json();
}

async function registerAndLogin(worker, boot) {
  const env = {};
  const devHeaders = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const regBegin = await worker.fetch(new Request("https://api.test/v1/auth/passkeys/register/begin", {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({ workspaceId: boot.workspaceId, principalId: boot.ownerPrincipalId, label: "owner" }),
  }), env);
  const regBeginBody = await regBegin.json();
  const registration = buildTestRegistrationResponse(regBeginBody.options.challenge);
  await worker.fetch(new Request("https://api.test/v1/auth/passkeys/register/finish", {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({
      challengeId: regBeginBody.challengeId,
      response: registration,
    }),
  }), env);

  const loginBegin = await worker.fetch(new Request("https://api.test/v1/auth/login/begin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId: boot.workspaceId,
      principalId: boot.ownerPrincipalId,
      label: "owner",
    }),
  }), env);
  const loginBeginBody = await loginBegin.json();
  const loginFinish = await worker.fetch(new Request("https://api.test/v1/auth/login/finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challengeId: loginBeginBody.challengeId,
      response: buildTestAuthenticationResponse(loginBeginBody.options.challenge, registration.id),
    }),
  }), env);
  assert.equal(loginFinish.status, 201);
  return { cookies: parseSetCookies(loginFinish), credentialId: registration.id };
}

async function apiJson(worker, path, { method = "GET", cookies, csrf = false, body } = {}) {
  const response = await worker.fetch(new Request(`https://api.test${path}`, {
    method,
    headers: sessionHeaders(cookies, { csrf }),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }), {});
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function stepUpPublish(worker, cookies, credentialId) {
  const begin = await apiJson(worker, "/v1/auth/step-up/begin", {
    method: "POST",
    cookies,
    csrf: true,
    body: { operation: "content.publish" },
  });
  assert.equal(begin.response.status, 200);
  await apiJson(worker, "/v1/auth/step-up/finish", {
    method: "POST",
    cookies,
    csrf: true,
    body: {
      challengeId: begin.json.challengeId,
      response: buildTestAuthenticationResponse(begin.json.options.challenge, credentialId),
    },
  });
}

async function publishRevision(worker, cookies, credentialId, contentItemId, revisionId) {
  await stepUpPublish(worker, cookies, credentialId);
  const approval = await apiJson(worker, `/v1/content/${contentItemId}/approvals`, {
    method: "POST",
    cookies,
    csrf: true,
    body: { revisionId, riskLevel: "medium" },
  });
  assert.equal(approval.response.status, 201, approval.json.error?.message);
  await apiJson(worker, `/v1/approvals/${approval.json.id}/decide`, {
    method: "POST",
    cookies,
    csrf: true,
    body: { decision: "approved", comment: "golden-path" },
  });
  const published = await apiJson(worker, `/v1/content/${contentItemId}/publish`, {
    method: "POST",
    cookies,
    csrf: true,
    body: { revisionId, approvalId: approval.json.id },
  });
  assert.ok(published.response.status === 200 || published.response.status === 201, published.json.error?.message);
  return published.json;
}

test("console golden path: empty body publish, revise body, republish, public HTML", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const blog = new BlogService(new MemoryBlogStore(), cms);
  const worker = createApiWorker(() => cms, { resolveBlog: () => blog });
  const publicWorker = createPublicWorker(() => cms, { resolveBlog: () => blog });
  const boot = await bootstrapWorker(worker);
  const { cookies, credentialId } = await registerAndLogin(worker, boot);

  const caps = await apiJson(worker, "/v1/console/capabilities", { cookies });
  assert.equal(caps.response.status, 200);
  assert.equal(caps.json.assetPublicDelivery, false);

  const blogSlug = `news-${Date.now()}`;
  const createdBlog = await apiJson(worker, "/v1/blogs", {
    method: "POST",
    cookies,
    csrf: true,
    body: {
      siteId: boot.siteId,
      title: "ニュース",
      slug: blogSlug,
      document: simpleDocument("ニュース", ""),
    },
  });
  assert.equal(createdBlog.response.status, 201);

  const article = await apiJson(worker, `/v1/blogs/${createdBlog.json.collection.id}/articles`, {
    method: "POST",
    cookies,
    csrf: true,
    body: {
      title: "だふぁ f",
      slug: "hello",
      document: simpleDocument("だふぁ f", ""),
    },
  });
  assert.equal(article.response.status, 201);
  const contentItemId = article.json.item.id;
  const path = article.json.route.path;
  const firstRevisionId = article.json.workingRevision.id;
  const lockVersion = article.json.item.lockVersion;

  await publishRevision(worker, cookies, credentialId, contentItemId, firstRevisionId);

  let publicRes = await publicWorker.fetch(new Request(`https://public.test${path}`), { SITE_ID: boot.siteId });
  let html = await publicRes.text();
  assert.equal(publicRes.status, 200);
  assert.match(html, /だふぁ f/);
  assert.doesNotMatch(html, /追記した本文/);

  const badRevise = await apiJson(worker, `/v1/content/${contentItemId}/revisions`, {
    method: "POST",
    cookies,
    csrf: true,
    body: {
      baseRevisionId: firstRevisionId,
      fields: { title: "だふぁ f" },
      document: simpleDocument("だふぁ f", "追記した本文"),
      changeSummary: "missing lock version",
    },
  });
  assert.equal(badRevise.json.error?.message, "expectedLockVersion must be a number");

  const revised = await apiJson(worker, `/v1/content/${contentItemId}/revisions`, {
    method: "POST",
    cookies,
    csrf: true,
    body: {
      baseRevisionId: firstRevisionId,
      expectedLockVersion: lockVersion,
      fields: { title: "だふぁ f" },
      document: simpleDocument("だふぁ f", "追記した本文"),
      changeSummary: "管理画面から編集",
    },
  });
  assert.equal(revised.response.status, 201, revised.json.error?.message);
  const secondRevisionId = revised.json.id;

  await publishRevision(worker, cookies, credentialId, contentItemId, secondRevisionId);

  publicRes = await publicWorker.fetch(new Request(`https://public.test${path}`), { SITE_ID: boot.siteId });
  html = await publicRes.text();
  assert.equal(publicRes.status, 200);
  assert.match(html, /追記した本文/);
});
