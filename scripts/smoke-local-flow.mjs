import { buildTestAuthenticationResponse } from "../packages/auth-kernel/dist/test-gateway.js";

const entry = await (await fetch("http://localhost:8787/v1/auth/instant-entry")).json();
if (!entry.available) {
  throw new Error("instant login not available — run npm run dev:stack or prove:local");
}

const jar = new Map();

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const [name, value] = pair.split("=");
    jar.set(name, value);
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path, { method = "GET", body, csrf } = {}) {
  const headers = { "content-type": "application/json", cookie: cookieHeader() };
  if (csrf) headers["x-baser-csrf-token"] = csrf;
  const response = await fetch(`http://localhost:8787${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  storeCookies(response);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${json.error?.message ?? "failed"}`);
  return json;
}

const instant = await api("/v1/auth/instant-login", { method: "POST", body: {} });
const hint = { siteId: instant.siteId, workspaceId: instant.workspaceId, ownerPrincipalId: instant.ownerPrincipalId, instantDemo: true };
const csrf = jar.get("baser_csrf");

const slug = `news-${Date.now()}`;
const blog = await api("/v1/blogs", {
  method: "POST",
  csrf,
  body: { siteId: hint.siteId, title: "ニュース", slug, document: doc("ニュース") },
});
const article = await api(`/v1/blogs/${blog.collection.id}/articles`, {
  method: "POST",
  csrf,
  body: { title: "初めての記事", slug: "hello", document: doc("初めての記事") },
});

if (!hint.instantDemo) {
  await api("/v1/auth/step-up/begin", { method: "POST", csrf, body: { operation: "content.publish" } }).then(async (stepBegin) => {
    await api("/v1/auth/step-up/finish", {
      method: "POST",
      csrf,
      body: {
        challengeId: stepBegin.challengeId,
        response: buildTestAuthenticationResponse(stepBegin.options.challenge, hint.credentialId),
      },
    });
  });
}

const snapshot = article;
const contentItemId = snapshot.item.id;
const revisionId = snapshot.workingRevision.id;
const approval = await api(`/v1/content/${contentItemId}/approvals`, {
  method: "POST",
  csrf,
  body: { revisionId, riskLevel: "medium" },
});
await api(`/v1/approvals/${approval.id}/decide`, {
  method: "POST",
  csrf,
  body: { decision: "approved", comment: "e2e" },
});
await api(`/v1/content/${contentItemId}/publish`, {
  method: "POST",
  csrf,
  body: { revisionId, approvalId: approval.id },
});

let publicUrl = `http://localhost:8788${article.route.path}?siteId=${encodeURIComponent(hint.siteId)}`;
let page = await fetch(publicUrl);
let html = await page.text();
if (!page.ok || !html.includes("初めての記事")) {
  throw new Error(`Public page failed after first publish: ${page.status}`);
}

const snap = await api(`/v1/content/${contentItemId}`);
const revised = await api(`/v1/content/${contentItemId}/revisions`, {
  method: "POST",
  csrf,
  body: {
    baseRevisionId: snap.workingRevision.id,
    expectedLockVersion: snap.item.lockVersion,
    fields: { title: "初めての記事" },
    document: doc("初めての記事", "追記した本文"),
    changeSummary: "golden-path revise",
  },
});

if (!hint.instantDemo) {
  await api("/v1/auth/step-up/begin", { method: "POST", csrf, body: { operation: "content.publish" } }).then(async (stepBegin) => {
    await api("/v1/auth/step-up/finish", {
      method: "POST",
      csrf,
      body: {
        challengeId: stepBegin.challengeId,
        response: buildTestAuthenticationResponse(stepBegin.options.challenge, hint.credentialId),
      },
    });
  });
}
const approval2 = await api(`/v1/content/${contentItemId}/approvals`, {
  method: "POST",
  csrf,
  body: { revisionId: revised.id, riskLevel: "medium" },
});
await api(`/v1/approvals/${approval2.id}/decide`, {
  method: "POST",
  csrf,
  body: { decision: "approved", comment: "e2e republish" },
});
await api(`/v1/content/${contentItemId}/publish`, {
  method: "POST",
  csrf,
  body: { revisionId: revised.id, approvalId: approval2.id },
});

page = await fetch(publicUrl);
html = await page.text();
if (!page.ok || !html.includes("追記した本文")) {
  throw new Error(`Public page missing body after republish: ${page.status}`);
}
console.log("E2E OK:", publicUrl);

function doc(title, body = "") {
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
            id: "h1",
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
