import { createApiBudget, CfApiCallError } from "@baser-edge/cf-stack-destroy";
import { TRIAL_API_WORKER, TRIAL_D1_NAME } from "@baser-edge/cf-stack-destroy";

const CF_API = "https://api.cloudflare.com/client/v4";

export type ProgressEvent = {
  step: string;
  message?: string;
  consoleUrl?: string;
  publicUrl?: string;
};

export type TrialProvisionConfig = {
  accountId: string;
  /** GitHub repo for Workers Builds seed (owner/name) */
  buildsRepo: string;
  buildsBranch: string;
  /** Monorepo root; build runs from here */
  buildsRootDirectory: string;
  buildCommand: string;
  deployCommand: string;
};

export type TrialProvisionResult = {
  consoleUrl: string;
  publicUrl: string;
  apiUrl: string;
};

async function cfJson<T>(
  token: string,
  path: string,
  init: RequestInit,
  budget: ReturnType<typeof createApiBudget>,
): Promise<T> {
  budget.spend(1);
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message?: string; code?: number }[];
    result?: T;
  };
  if (!res.ok || body.success === false) {
    const errors = (body.errors ?? []).map((e) => ({
      code: e.code ?? 0,
      message: e.message ?? "Unknown error",
    }));
    throw new CfApiCallError(errors[0]?.message ?? res.statusText ?? "Cloudflare API error", res.status, errors);
  }
  return body.result as T;
}

export async function ensureD1Database(
  token: string,
  accountId: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<string> {
  const list = await cfJson<{ uuid: string; name: string }[]>(
    token,
    `/accounts/${accountId}/d1/database`,
    { method: "GET" },
    budget,
  );
  const hit = list?.find((db) => db.name === TRIAL_D1_NAME);
  if (hit?.uuid) return hit.uuid;

  const created = await cfJson<{ uuid: string }>(
    token,
    `/accounts/${accountId}/d1/database`,
    { method: "POST", body: JSON.stringify({ name: TRIAL_D1_NAME }) },
    budget,
  );
  if (!created?.uuid) throw new CfApiCallError("D1 create returned no uuid", 500);
  return created.uuid;
}

export async function d1Exec(
  token: string,
  accountId: string,
  databaseId: string,
  sql: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<void> {
  await cfJson(
    token,
    `/accounts/${accountId}/d1/database/${databaseId}/query`,
    { method: "POST", body: JSON.stringify({ sql }) },
    budget,
  );
}

/** @see https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/list/ */
export async function listBuildTriggers(
  token: string,
  accountId: string,
  budget: ReturnType<typeof createApiBudget>,
  workerScriptId: string = TRIAL_API_WORKER,
): Promise<{ uuid: string; trigger_name?: string }[]> {
  try {
    const result = await cfJson<{ trigger_uuid?: string; trigger_name?: string }[]>(
      token,
      `/accounts/${accountId}/builds/workers/${encodeURIComponent(workerScriptId)}/triggers`,
      { method: "GET" },
      budget,
    );
    return (result ?? []).map((t) => ({
      uuid: t.trigger_uuid ?? "",
      trigger_name: t.trigger_name,
    })).filter((t) => t.uuid);
  } catch (e) {
    if (e instanceof CfApiCallError && e.status === 404) return [];
    throw e;
  }
}

export async function createBuildTrigger(
  token: string,
  accountId: string,
  config: TrialProvisionConfig,
  budget: ReturnType<typeof createApiBudget>,
): Promise<string> {
  const [owner, repository] = config.buildsRepo.split("/");
  if (!owner || !repository) throw new Error(`Invalid buildsRepo: ${config.buildsRepo}`);

  const result = await cfJson<{ trigger_uuid?: string; uuid?: string }>(
    token,
    `/accounts/${accountId}/builds/triggers`,
    {
      method: "POST",
      body: JSON.stringify({
        trigger_name: "baserEdge trial provision",
        build_command: config.buildCommand,
        deploy_command: config.deployCommand,
        root_directory: config.buildsRootDirectory,
        branch_includes: [config.buildsBranch],
        branch_excludes: [],
        path_includes: ["*"],
        path_excludes: [],
        external_script_id: TRIAL_API_WORKER,
        repo_connection: {
          provider: "github",
          owner,
          repository,
        },
      }),
    },
    budget,
  );
  const triggerUuid = result?.trigger_uuid ?? result?.uuid;
  if (!triggerUuid) throw new CfApiCallError("Create build trigger returned no trigger_uuid", 500);
  return triggerUuid;
}

export async function startManualBuild(
  token: string,
  accountId: string,
  triggerUuid: string,
  config: TrialProvisionConfig,
  budget: ReturnType<typeof createApiBudget>,
): Promise<string> {
  const [owner, repository] = config.buildsRepo.split("/");
  const result = await cfJson<{ build_uuid: string }>(
    token,
    `/accounts/${accountId}/builds/triggers/${triggerUuid}/builds`,
    {
      method: "POST",
      body: JSON.stringify({
        branch: config.buildsBranch,
        seed_repo: {
          provider: "github",
          owner,
          repository,
          branch: config.buildsBranch,
          path: config.buildsRootDirectory,
        },
      }),
    },
    budget,
  );
  if (!result?.build_uuid) throw new CfApiCallError("Manual build returned no build_uuid", 500);
  return result.build_uuid;
}

export async function getBuildStatus(
  token: string,
  accountId: string,
  buildUuid: string,
  budget: ReturnType<typeof createApiBudget>,
): Promise<{ status?: string; log_url?: string }> {
  return cfJson(
    token,
    `/accounts/${accountId}/builds/builds/${buildUuid}`,
    { method: "GET" },
    budget,
  );
}

export function parseConsoleUrlFromLog(text: string): string | null {
  const m = text.match(/https:\/\/[^\s]+\/console\//);
  return m?.[0] ?? null;
}

export function parseWorkerSubdomainUrl(text: string, scriptName: string): string | null {
  const re = new RegExp(`https://${scriptName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\s]*\\.workers\\.dev`, "i");
  const m = text.match(re);
  return m?.[0] ?? null;
}
