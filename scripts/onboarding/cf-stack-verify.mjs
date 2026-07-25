import { listAccounts } from "./cloudflare-token.mjs";
import { apiWorkerName, publicWorkerName, runWithStackId } from "../cloudflare/stack.mjs";

const CF_API = "https://api.cloudflare.com/client/v4";

/** 開始ページ経由で作ったスタックだけ UI から触れる */
export function isOnboardingStackId(stackId) {
  return /^ob-[a-z0-9][a-z0-9-]{3,30}$/i.test(stackId);
}

export function baserEdgeWorkerNames(stackId) {
  return runWithStackId(stackId, () => ({
    apiWorker: apiWorkerName(),
    publicWorker: publicWorkerName(),
  }));
}

async function cfFetch(token, path) {
  const res = await fetch(`${CF_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success !== false, status: res.status, body };
}

export async function primaryAccountId(token) {
  const accounts = await listAccounts(token);
  return accounts[0].id;
}

/** 削除前: トークンの口座に baserEdge お試し Worker があることだけ確認する */
export async function assertOnboardingStackExists(token, stackId) {
  if (!isOnboardingStackId(stackId)) {
    throw new Error("このスタック ID はお試し開設用ではありません");
  }
  const accountId = await primaryAccountId(token);
  const { apiWorker } = baserEdgeWorkerNames(stackId);
  if (!apiWorker.startsWith("baser-edge-api-ob-")) {
    throw new Error("内部エラー: 想定外の Worker 名です");
  }
  const { ok, status } = await cfFetch(
    token,
    `/accounts/${accountId}/workers/scripts/${encodeURIComponent(apiWorker)}`,
  );
  if (ok) return { accountId, apiWorker };
  if (status === 404) {
    throw new Error(
      "このスタックは見つかりませんでした。スタック ID と API トークン（同じ Cloudflare アカウント）を確認してください。",
    );
  }
  throw new Error("Cloudflare でスタックの確認に失敗しました。トークン権限を確認してください。");
}
