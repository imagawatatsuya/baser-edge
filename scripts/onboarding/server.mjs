#!/usr/bin/env node
/**
 * baserEdge onboarding API: 顧客 CF アカウントへお試し開設（OAuth 推奨）。
 *   node scripts/onboarding/server.mjs
 * 公開お試し: BASER_ONBOARDING_PUBLIC=1 + OAuth + build:onboarding-web（/start/ を同プロセスで配信可）
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyCloudflareApiToken, listAccounts } from "./cloudflare-token.mjs";
import { createSession, loadSession, updateSession } from "./session-store.mjs";
import { assertOnboardingStackExists, isOnboardingStackId } from "./cf-stack-verify.mjs";
import { runProve } from "../cloudflare/run-prove.mjs";
import { runDestroy } from "../cloudflare/run-destroy.mjs";
import {
  oauthConfigured,
  createOAuthState,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
} from "./cf-oauth.mjs";
import { savePendingState, takePendingState, issueGrant, takeGrant } from "./oauth-grants.mjs";
import { publicTrialMode, trialServiceReady } from "./onboarding-config.mjs";
import { tryServeOnboardingUi, onboardingUiDistReady } from "./serve-ui.mjs";
import { checkRateLimit, clientIp } from "./rate-limit.mjs";

const UI_ORIGIN = (process.env.BASER_ONBOARDING_UI_ORIGIN ?? "http://localhost:5174").replace(/\/$/, "");

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const PORT = Number(process.env.BASER_ONBOARDING_PORT ?? 8790);

const jobs = new Map();

/** 同一ホスト上の wrangler 設定書き換えを直列化（同時開設の競合防止） */
let cfOpsChain = Promise.resolve();
function withCfOpsLock(fn) {
  const next = cfOpsChain.then(fn);
  cfOpsChain = next.catch(() => {});
  return next;
}

function newOnboardingStackId() {
  return `ob-${randomBytes(12).toString("hex")}`;
}

function resolveProvisionStackId() {
  const fixed = process.env.BASER_ONBOARDING_PROVISION_STACK_ID?.trim().toLowerCase();
  if (!fixed) return newOnboardingStackId();
  if (fixed === "trial") return "trial";
  throw new Error(`BASER_ONBOARDING_PROVISION_STACK_ID "${fixed}" is not allowed`);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("リクエストの形式が正しくありません");
  }
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function rateLimited(res, req, route) {
  const ip = clientIp(req);
  const result = checkRateLimit(`${ip}:${route}`);
  if (result.allowed) return false;
  res.writeHead(429, {
    "content-type": "application/json; charset=utf-8",
    "retry-after": String(result.retryAfterSec),
  });
  res.end(
    JSON.stringify({
      error: { message: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
    }),
  );
  return true;
}

function cors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function requestOrigin(req) {
  const host = req.headers.host;
  if (!host) return UI_ORIGIN;
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto =
    (typeof protoHeader === "string" ? protoHeader.split(",")[0]?.trim() : undefined) ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function oauthRedirectForRequest(req) {
  return `${requestOrigin(req)}/api/onboarding/oauth/callback`;
}

function uiOriginForRequest(req) {
  if (process.env.BASER_ONBOARDING_UI_ORIGIN?.trim()) return UI_ORIGIN;
  return requestOrigin(req);
}

async function resolveApiToken(body) {
  const grantId = String(body.oauthGrantId ?? "").trim();
  const manual = String(body.cloudflareApiToken ?? "").trim();
  if (publicTrialMode() && manual && !grantId) {
    throw new Error("お試しでは Cloudflare ログインから操作してください（API トークンの貼り付けはできません）。");
  }
  if (grantId) {
    const token = takeGrant(grantId);
    if (!token) {
      throw new Error("Cloudflare 接続の有効期限が切れました。もう一度「Cloudflare でログイン」からやり直してください。");
    }
    return token;
  }
  const token = String(body.cloudflareApiToken ?? "").trim();
  if (!token) {
    throw new Error("Cloudflare に接続してください（ログイン）か、API トークンを入力してください。");
  }
  return token;
}

async function beginSessionWithToken(apiToken) {
  await verifyCloudflareApiToken(apiToken);
  const accounts = await listAccounts(apiToken);
  const account = accounts[0];
  const stackId = resolveProvisionStackId();
  const session = createSession({ accountName: account.name, stackId });

  if (jobs.has(session.id)) throw new Error("ジョブが既に実行中です");
  jobs.set(session.id, true);
  void withCfOpsLock(() => startDeploy(session.id, apiToken, stackId));

  return {
    sessionId: session.id,
    stackId,
    accountName: account.name,
    status: "running",
  };
}

async function startDeploy(sessionId, apiToken, stackId) {
  const prevStack = process.env.BASER_CF_STACK;
  const prevToken = process.env.CLOUDFLARE_API_TOKEN;
  const prevProve = process.env.BASER_CF_PROVE;
  const prevTrial = process.env.BASER_TRIAL_NO_R2;
  process.env.CLOUDFLARE_API_TOKEN = apiToken;
  process.env.BASER_CF_PROVE = "1";
  process.env.BASER_CF_STACK = stackId;
  process.env.BASER_TRIAL_NO_R2 = "1";

  try {
    updateSession(sessionId, { status: "running", step: "connect", message: "Cloudflare に接続しました" });
    const result = await runProve({
      runSmoke: false,
      trialNoR2: true,
      log: () => {},
      onProgress: (event) => {
        updateSession(sessionId, {
          status: event.step === "succeeded" ? "succeeded" : "running",
          step: event.step,
          message: event.message ?? "",
          consoleUrl: event.consoleUrl ?? undefined,
          publicUrl: event.publicUrl ?? undefined,
        });
      },
    });
    updateSession(sessionId, {
      status: "succeeded",
      step: "succeeded",
      message: "サイトの準備ができました",
      consoleUrl: result.consoleUrl,
      publicUrl: result.state.publicUrl,
    });
  } catch (error) {
    updateSession(sessionId, {
      status: "failed",
      step: "failed",
      message: "開設に失敗しました",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    delete process.env.CLOUDFLARE_API_TOKEN;
    if (prevToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = prevToken;
    else delete process.env.CLOUDFLARE_API_TOKEN;
    if (prevStack !== undefined) process.env.BASER_CF_STACK = prevStack;
    else delete process.env.BASER_CF_STACK;
    if (prevProve !== undefined) process.env.BASER_CF_PROVE = prevProve;
    else delete process.env.BASER_CF_PROVE;
    if (prevTrial !== undefined) process.env.BASER_TRIAL_NO_R2 = prevTrial;
    else delete process.env.BASER_TRIAL_NO_R2;
    jobs.delete(sessionId);
  }
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (tryServeOnboardingUi(req, res, url)) return;

  const oauthOn = oauthConfigured();
  const publicTrial = publicTrialMode();
  const serviceReady = trialServiceReady(oauthOn);

  if (req.method === "GET" && url.pathname === "/api/onboarding/health") {
    return json(res, serviceReady ? 200 : 503, {
      ok: serviceReady,
      service: "baser-edge-onboarding",
      oauthEnabled: oauthOn,
      publicTrial,
      ready: serviceReady,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/onboarding/help") {
    const help = JSON.parse(readFileSync(join(root, "scripts/onboarding/help.json"), "utf8"));
    help.oauthEnabled = oauthOn;
    help.publicTrial = publicTrial;
    help.ready = serviceReady;
    const provisionFixed = process.env.BASER_ONBOARDING_PROVISION_STACK_ID?.trim().toLowerCase();
    if (provisionFixed === "trial") help.provisionStackId = "trial";
    const teardownUrl = process.env.BASER_EDGE_OPS_PUBLIC_URL?.trim();
    if (teardownUrl) help.teardownUrl = teardownUrl;
    return json(res, 200, help);
  }

  if (!serviceReady && url.pathname.startsWith("/api/onboarding/")) {
    return json(res, 503, {
      error: {
        message:
          "お試しの開設サービスは現在ご利用いただけません。しばらくしてから再度お試しください。",
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/api/onboarding/oauth/start") {
    if (rateLimited(res, req, "oauth-start")) return;
    if (!oauthOn) {
      return json(res, 503, { error: { message: "OAuth が未設定です" } });
    }
    const intent = url.searchParams.get("intent") === "destroy" ? "destroy" : "deploy";
    const redirectUri = oauthRedirectForRequest(req);
    const { state, codeVerifier, codeChallenge } = createOAuthState();
    savePendingState(state, codeVerifier, intent);
    return redirect(res, buildAuthorizationUrl({ state, codeChallenge, redirectUri }));
  }

  if (req.method === "GET" && url.pathname === "/api/onboarding/oauth/callback") {
    const ui = uiOriginForRequest(req);
    const redirectUri = oauthRedirectForRequest(req);
    try {
      if (!oauthOn) throw new Error("OAuth が未設定です");
      const err = url.searchParams.get("error");
      if (err) {
        const desc = url.searchParams.get("error_description") ?? err;
        return redirect(res, `${ui}/start/?oauth_error=${encodeURIComponent(desc)}`);
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("OAuth コールバックが不完全です");
      const pending = takePendingState(state);
      if (!pending) throw new Error("セッションの有効期限が切れました。もう一度お試しください。");
      const { accessToken } = await exchangeAuthorizationCode(code, pending.codeVerifier, redirectUri);
      const grantId = issueGrant(accessToken);
      const intentQ =
        pending.intent === "destroy" ? `&oauth_intent=destroy` : "";
      return redirect(res, `${ui}/start/?oauth_grant=${grantId}${intentQ}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return redirect(res, `${ui}/start/?oauth_error=${encodeURIComponent(msg)}`);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/onboarding/sessions") {
    if (rateLimited(res, req, "sessions")) return;
    try {
      const body = await readJson(req);
      const token = await resolveApiToken(body);
      const result = await beginSessionWithToken(token);
      return json(res, 201, result);
    } catch (error) {
      return json(res, 400, { error: { message: error instanceof Error ? error.message : String(error) } });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/onboarding/destroy") {
    if (rateLimited(res, req, "destroy")) return;
    try {
      const body = await readJson(req);
      const token = await resolveApiToken(body);
      const stackId = String(body.stackId ?? "").trim();
      if (!stackId) return json(res, 400, { error: { message: "スタック ID を入力してください" } });
      if (!isOnboardingStackId(stackId)) {
        return json(res, 400, {
          error: { message: "スタック ID の形式が正しくありません（お試し開設で付与された ob-… の ID）" },
        });
      }

      await verifyCloudflareApiToken(token);
      const { apiWorker } = await assertOnboardingStackExists(token, stackId);

      const result = await withCfOpsLock(async () => {
        const prevStack = process.env.BASER_CF_STACK;
        const prevToken = process.env.CLOUDFLARE_API_TOKEN;
        const prevDestroy = process.env.BASER_CF_DESTROY;
        const prevTrial = process.env.BASER_TRIAL_NO_R2;
        process.env.CLOUDFLARE_API_TOKEN = token;
        process.env.BASER_CF_STACK = stackId;
        process.env.BASER_CF_DESTROY = "1";
        process.env.BASER_TRIAL_NO_R2 = "1";

        try {
          const { anyRemoved } = await runDestroy({ log: () => {} });
          if (!anyRemoved) {
            throw new Error("削除対象のリソースがありませんでした（既に削除済みの可能性があります）");
          }
          return { apiWorker };
        } finally {
          delete process.env.CLOUDFLARE_API_TOKEN;
          if (prevToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = prevToken;
          if (prevStack !== undefined) process.env.BASER_CF_STACK = prevStack;
          else delete process.env.BASER_CF_STACK;
          if (prevDestroy !== undefined) process.env.BASER_CF_DESTROY = prevDestroy;
          else delete process.env.BASER_CF_DESTROY;
          if (prevTrial !== undefined) process.env.BASER_TRIAL_NO_R2 = prevTrial;
          else delete process.env.BASER_TRIAL_NO_R2;
        }
      });

      return json(res, 200, {
        ok: true,
        message: `お試しサイト（${result.apiWorker}）を Cloudflare から削除しました`,
      });
    } catch (error) {
      return json(res, 400, { error: { message: error instanceof Error ? error.message : String(error) } });
    }
  }

  const match = url.pathname.match(/^\/api\/onboarding\/sessions\/([a-f0-9]+)$/);
  if (req.method === "GET" && match?.[1]) {
    const session = loadSession(match[1]);
    if (!session) return json(res, 404, { error: { message: "セッションが見つかりません" } });
    return json(res, 200, {
      id: session.id,
      status: session.status,
      step: session.step,
      message: session.message,
      consoleUrl: session.consoleUrl,
      publicUrl: session.publicUrl,
      accountName: session.accountName,
      stackId: session.stackId,
      error: session.error,
    });
  }

  json(res, 404, { error: { message: "Not found" } });
});

server.listen(PORT, () => {
  const oauthOn = oauthConfigured();
  const publicTrial = publicTrialMode();
  console.log(`baserEdge onboarding API: http://localhost:${PORT}`);
  if (onboardingUiDistReady()) {
    console.log(`開始ページ (同梱): http://localhost:${PORT}/start/`);
  } else {
    console.log(`開始ページ (dev): npm run dev -w @baser-edge/onboarding-web → http://localhost:5174/start/`);
  }
  if (publicTrial) {
    console.log("公開お試しモード: ON（利用者は OAuth のみ。BASER_ONBOARDING_PUBLIC=0 で無効化）");
    if (!oauthOn) console.error("公開お試しには Cloudflare OAuth クライアントが必須です。");
  }
  if (oauthOn) {
    console.log("Cloudflare OAuth: 有効");
  } else if (!publicTrial) {
    console.log("Cloudflare OAuth: 未設定 → 開発時は手動 API トークン可。docs/deployment/cloudflare-oauth-onboarding.md");
  }
});
