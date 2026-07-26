import { createApiBudget } from "@baser-edge/cf-stack-destroy";
import { TRIAL_API_WORKER, TRIAL_PUBLIC_WORKER } from "@baser-edge/cf-stack-destroy";
import {
  createBuildTrigger,
  ensureD1Database,
  getBuildStatus,
  listBuildTriggers,
  parseConsoleUrlFromLog,
  parseWorkerSubdomainUrl,
  startManualBuild,
  type ProgressEvent,
  type TrialProvisionConfig,
} from "./cloudflare-builds.js";

export type { ProgressEvent, TrialProvisionConfig, TrialProvisionResult } from "./cloudflare-builds.js";
export { ensureD1Database } from "./cloudflare-builds.js";

const POLL_MS = 8000;
const MAX_POLLS = 90;

export async function runTrialProvision(
  token: string,
  config: TrialProvisionConfig,
  onProgress: (event: ProgressEvent) => void | Promise<void>,
): Promise<{ consoleUrl: string; publicUrl: string; apiUrl: string }> {
  const budget = createApiBudget(120);
  const { accountId } = config;

  onProgress({ step: "provision", message: "データベースを準備しています…" });
  await ensureD1Database(token, accountId, budget);

  onProgress({ step: "build", message: "利用者の Cloudflare でビルドを開始しています…" });

  let triggers = await listBuildTriggers(token, accountId, budget);
  let triggerUuid =
    triggers.find((t) => t.trigger_name?.includes("baserEdge"))?.uuid ?? triggers[0]?.uuid;
  if (!triggerUuid) {
    try {
      triggerUuid = await createBuildTrigger(token, accountId, config, budget);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Workers Builds の設定に失敗しました（workers-ci 権限または GitHub 連携が必要な場合があります）: ${msg}`,
      );
    }
  }

  const buildUuid = await startManualBuild(token, accountId, triggerUuid, config, budget);
  onProgress({ step: "deploy", message: "ビルドとデプロイを実行しています…（数分かかります）" });

  let lastStatus = "";
  let logSnippet = "";
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_MS);
    const status = await getBuildStatus(token, accountId, buildUuid, budget);
    const st = status.status ?? "unknown";
    if (st !== lastStatus) {
      lastStatus = st;
      onProgress({ step: "deploy", message: `ビルド状態: ${st}` });
    }
    if (status.log_url) {
      try {
        const logRes = await fetch(status.log_url);
        if (logRes.ok) logSnippet = await logRes.text();
      } catch {
        /* ignore log fetch errors */
      }
    }
    if (st === "stopped" || st === "success" || st === "completed") break;
    if (st === "failed" || st === "canceled") {
      throw new Error(`Workers Builds が失敗しました（${st}）。Cloudflare ダッシュボードの Builds ログを確認してください。`);
    }
  }

  const consoleUrl = parseConsoleUrlFromLog(logSnippet);
  const apiUrl = parseWorkerSubdomainUrl(logSnippet, TRIAL_API_WORKER);
  const publicUrl = parseWorkerSubdomainUrl(logSnippet, TRIAL_PUBLIC_WORKER);

  if (!consoleUrl && apiUrl) {
    const base = apiUrl.replace(/\/$/, "");
    onProgress({ step: "verify", message: "管理画面の URL を確認しています…", consoleUrl: `${base}/console/` });
    return { consoleUrl: `${base}/console/`, publicUrl: publicUrl ?? apiUrl, apiUrl };
  }
  if (!consoleUrl) {
    throw new Error(
      "ビルドは終了しましたが管理画面 URL を取得できませんでした。Cloudflare ダッシュボードの Workers Builds ログを確認してください。",
    );
  }

  onProgress({
    step: "succeeded",
    message: "サイトの準備ができました",
    consoleUrl,
    publicUrl: publicUrl ?? undefined,
  });
  return {
    consoleUrl,
    publicUrl: publicUrl ?? consoleUrl.replace(/\/console\/?$/, ""),
    apiUrl: apiUrl ?? consoleUrl.replace(/\/console\/?$/, ""),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
