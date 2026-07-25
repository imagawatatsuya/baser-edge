import { buildTestAuthenticationResponse, buildTestRegistrationResponse } from "@baser-edge/auth-kernel";

export async function bootstrapRemote(apiUrl) {
  const base = apiUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/bootstrap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceName: "baserEdge Demo",
      siteName: "デモサイト",
      hostname: "demo.baseredge.local",
      ownerName: "Owner",
      locale: "ja-JP",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    if (body?.error?.code === "WORKSPACE_EXISTS") return null;
    throw new Error(`Bootstrap failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export async function registerDemoPasskey(apiUrl, boot, bootstrapSecret) {
  const base = apiUrl.replace(/\/$/, "");
  const devHeaders = {
    "content-type": "application/json",
    "x-baser-principal-id": boot.ownerPrincipalId,
    "x-baser-principal-type": "human",
  };
  const label = "demo-owner";
  const begin = await fetch(`${base}/v1/auth/passkeys/register/begin`, {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({
      workspaceId: boot.workspaceId,
      principalId: boot.ownerPrincipalId,
      label,
      bootstrapSecret,
    }),
  });
  const beginBody = await begin.json();
  if (!begin.ok) throw new Error(`passkey register/begin: ${JSON.stringify(beginBody)}`);
  const registration = buildTestRegistrationResponse(beginBody.options.challenge);
  const finish = await fetch(`${base}/v1/auth/passkeys/register/finish`, {
    method: "POST",
    headers: devHeaders,
    body: JSON.stringify({
      challengeId: beginBody.challengeId,
      response: registration,
      transports: [],
    }),
  });
  const finishBody = await finish.json();
  if (!finish.ok) throw new Error(`passkey register/finish: ${JSON.stringify(finishBody)}`);
  return {
    workspaceId: boot.workspaceId,
    siteId: boot.siteId,
    ownerPrincipalId: boot.ownerPrincipalId,
    passkeyLabel: label,
    credentialId: registration.id,
    apiUrl: base,
  };
}

export async function instantLogin(hint) {
  const base = hint.apiUrl.replace(/\/$/, "");
  const jar = new Map();

  function storeCookies(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const [name, value] = pair.split("=");
      if (name && value) jar.set(name.trim(), value.trim());
    }
  }

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async function api(path, { method = "GET", body, csrf } = {}) {
    const headers = { "content-type": "application/json", cookie: cookieHeader() };
    if (csrf) headers["x-baser-csrf-token"] = csrf;
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    storeCookies(response);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${path} ${response.status}: ${json.error?.message ?? JSON.stringify(json)}`);
    return json;
  }

  await api("/v1/auth/instant-login", { method: "POST", body: {} });
  const csrf = jar.get("baser_csrf");
  if (!csrf) throw new Error("missing baser_csrf cookie after instant login");
  return { api, csrf, jar };
}

async function legacyPasskeyLogin(hint) {
  const base = hint.apiUrl.replace(/\/$/, "");
  const jar = new Map();

  function storeCookies(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const [name, value] = pair.split("=");
      if (name && value) jar.set(name.trim(), value.trim());
    }
  }

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async function api(path, { method = "GET", body, csrf } = {}) {
    const headers = { "content-type": "application/json", cookie: cookieHeader() };
    if (csrf) headers["x-baser-csrf-token"] = csrf;
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    storeCookies(response);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${path} ${response.status}: ${json.error?.message ?? JSON.stringify(json)}`);
    return json;
  }

  const begin = await api("/v1/auth/login/begin", {
    method: "POST",
    body: {
      workspaceId: hint.workspaceId,
      principalId: hint.ownerPrincipalId,
      label: hint.passkeyLabel,
    },
  });
  await api("/v1/auth/login/finish", {
    method: "POST",
    body: {
      challengeId: begin.challengeId,
      response: buildTestAuthenticationResponse(begin.options.challenge, hint.credentialId),
    },
  });
  const csrf = jar.get("baser_csrf");
  if (!csrf) throw new Error("missing baser_csrf cookie after login");
  return { api, csrf, jar };
}

export async function smokeLoginAndPublish(hint, publicUrl) {
  const { api, csrf } = hint.instantDemo
    ? await instantLogin(hint)
    : await legacyPasskeyLogin(hint);

  const slug = `proof-${Date.now()}`;
  const page = await api("/v1/pages", {
    method: "POST",
    csrf,
    body: {
      siteId: hint.siteId,
      parentId: null,
      slug,
      title: "Cloudflare 実証",
      document: demoDocument("Cloudflare 実証", "baserEdge on Cloudflare"),
    },
  });

  const contentItemId = page.item.id;
  const revisionId = page.workingRevision.id;
  const approval = await api(`/v1/content/${contentItemId}/approvals`, {
    method: "POST",
    csrf,
    body: { revisionId, riskLevel: "medium" },
  });
  await api(`/v1/approvals/${approval.id}/decide`, {
    method: "POST",
    csrf,
    body: { decision: "approved", comment: "cloudflare-proof" },
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
  await api(`/v1/content/${contentItemId}/publish`, {
    method: "POST",
    csrf,
    body: { revisionId, approvalId: approval.id },
  });

  const pubBase = publicUrl.replace(/\/$/, "");
  const publicRes = await fetch(`${pubBase}/${slug}?siteId=${encodeURIComponent(hint.siteId)}`);
  if (!publicRes.ok) throw new Error(`public GET /${slug} returned ${publicRes.status}`);
  const html = await publicRes.text();
  if (!html.includes("baserEdge on Cloudflare")) {
    throw new Error("public HTML missing expected heading text");
  }
  return { slug, publicUrl: `${pubBase}/${slug}?siteId=${encodeURIComponent(hint.siteId)}` };
}

function demoDocument(title, body) {
  return {
    formatVersion: 1,
    root: {
      id: "root",
      type: "page",
      componentVersion: 1,
      props: {},
      slots: {
        body: [
          { id: "h1", type: "heading", componentVersion: 1, props: { level: 1, text: title }, slots: {} },
          { id: "body", type: "richText", componentVersion: 1, props: { paragraphs: [body] }, slots: {} },
        ],
      },
    },
  };
}
