import { createApiBudget } from "@baser-edge/cf-stack-destroy";
import { ensureD1Database, type ProgressEvent } from "./cloudflare-builds.js";
import {
  MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS,
  cleanupTrialMigrationRunner,
  prepareTrialMigrationRunner,
  runTrialMigrationChunk,
  trialMigrationStatementCount,
  type TrialMigrationRunner,
} from "./apply-migrations-runner.js";
import {
  fetchWorkersSubdomain,
  publishWorkerToWorkersDev,
  putWorkerScript,
  putWorkerSecrets,
  uploadWorkerAssets,
  workerSubdomainUrl,
} from "./deploy-worker.js";
import {
  bootstrapTrialRemote,
  fetchTrialReleaseBytes,
  fetchTrialReleaseText,
  loadTrialReleaseManifest,
  randomTrialSecret,
  waitForBootstrapSecret,
  type TrialReleaseConfig,
} from "./run-trial-provision-release.js";
import { fetchTrialProvisionerIdentity } from "./cf-provisioner-identity.js";

export const TRIAL_PROVISION_STEP_API_BUDGET = 35;
export const TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS = 12;
export const TRIAL_PROVISION_SECRET_PROBE_ATTEMPTS = 12;
export const TRIAL_PROVISION_STEP_EXTERNAL_SUBREQUEST_CEILING =
  Math.max(
    TRIAL_PROVISION_STEP_API_BUDGET
      + Math.max(TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS, MIGRATION_RUNNER_ROUTE_PROBE_ATTEMPTS),
    TRIAL_PROVISION_SECRET_PROBE_ATTEMPTS,
  );

export const TRIAL_PROVISION_UI_STEPS = [
  { id: "connect", label: "Cloudflare に接続" },
  { id: "provision", label: "データベースの作成" },
  { id: "migrate", label: "データベース初期化" },
  { id: "assets", label: "管理画面ファイルの準備" },
  { id: "deploy-public", label: "公開サイト Worker の配置" },
  { id: "deploy-api", label: "管理 API Worker の配置" },
  { id: "secrets", label: "認証情報の設定" },
  { id: "bootstrap", label: "初期サイトの作成" },
  { id: "finalize", label: "最終設定と動作確認" },
  { id: "succeeded", label: "完了" },
] as const;

type TrialSecrets = {
  ASSET_UPLOAD_SECRET: string;
  PREVIEW_SECRET: string;
  MAIL_FORM_SECRET: string;
  MAIL_PRIVACY_SALT: string;
  BASER_BOOTSTRAP_SECRET: string;
};

type BootstrapResult = {
  workspaceId: string;
  siteId: string;
  ownerPrincipalId: string;
} | null;

export type TrialProvisionReleaseStage =
  | "prepare"
  | "prepare-migrations"
  | "migrate"
  | "cleanup-migrations"
  | "upload-assets"
  | "deploy-public-initial"
  | "deploy-api-initial"
  | "secrets"
  | "verify-bootstrap-secret"
  | "bootstrap"
  | "deploy-public-final"
  | "deploy-api-final";

export type TrialProvisionReleaseState = {
  stage: TrialProvisionReleaseStage;
  databaseId?: string;
  migrationRunner?: TrialMigrationRunner;
  migrationCursor?: number;
  assetsJwt?: string;
  apiUrl?: string;
  publicUrl?: string;
  secrets?: TrialSecrets;
  bootstrap?: BootstrapResult;
};

export function trialProvisionStageProgress(stage: TrialProvisionReleaseStage): ProgressEvent {
  switch (stage) {
    case "prepare":
      return progress("provision", "Cloudflare D1 データベースを準備しています…");
    case "prepare-migrations":
    case "migrate":
    case "cleanup-migrations":
      return progress("migrate", "データベースを初期化しています…");
    case "upload-assets":
      return progress("assets", "管理画面ファイルを準備しています…");
    case "deploy-public-initial":
      return progress("deploy-public", "公開サイト Worker を配置しています…");
    case "deploy-api-initial":
      return progress("deploy-api", "管理 API Worker を配置しています…");
    case "secrets":
    case "verify-bootstrap-secret":
      return progress("secrets", "サイトの認証情報を設定しています…");
    case "bootstrap":
      return progress("bootstrap", "初期サイトと管理者を作成しています…");
    case "deploy-public-final":
    case "deploy-api-final":
      return progress("finalize", "最終設定を反映し、動作を確認しています…");
  }
}

export type TrialProvisionReleaseStepResult =
  | {
      done: false;
      state: TrialProvisionReleaseState;
      progress: ProgressEvent;
    }
  | {
      done: true;
      result: { consoleUrl: string; publicUrl: string; apiUrl: string };
      progress: ProgressEvent;
    };

function requiredString(
  state: TrialProvisionReleaseState,
  key: "databaseId" | "apiUrl" | "publicUrl",
): string {
  const value = state[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`開設チェックポイントが不正です (${state.stage}.${key})`);
  }
  return value;
}

function requiredSecrets(state: TrialProvisionReleaseState): TrialSecrets {
  if (!state.secrets) throw new Error(`開設チェックポイントが不正です (${state.stage}.secrets)`);
  return state.secrets;
}

function releaseUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function progress(step: string, message: string): ProgressEvent {
  return { step, message };
}

/**
 * Executes exactly one resumable provisioning stage. The Queue consumer
 * encrypts the returned state and enqueues it as a new message, so the
 * Workers Free external-subrequest counter resets between stages.
 */
export async function runTrialProvisionReleaseStep(
  token: string,
  config: TrialReleaseConfig,
  input?: TrialProvisionReleaseState,
): Promise<TrialProvisionReleaseStepResult> {
  const state = input ?? { stage: "prepare" };
  const budget = createApiBudget(TRIAL_PROVISION_STEP_API_BUDGET);
  const { accountId, releaseBaseUrl } = config;

  switch (state.stage) {
    case "prepare": {
      const databaseId = await ensureD1Database(token, accountId, budget);
      return {
        done: false,
        state: { stage: "prepare-migrations", databaseId },
        progress: progress("provision", "データベースを準備しました"),
      };
    }

    case "prepare-migrations": {
      const databaseId = requiredString(state, "databaseId");
      const manifest = await loadTrialReleaseManifest(config);
      const migrationRunner = await prepareTrialMigrationRunner(
        token,
        accountId,
        databaseId,
        manifest.migrations,
        budget,
      );
      return {
        done: false,
        state: { stage: "migrate", databaseId, migrationRunner, migrationCursor: 0 },
        progress: progress("migrate", "データベースを初期化しています…"),
      };
    }

    case "migrate": {
      const databaseId = requiredString(state, "databaseId");
      if (!state.migrationRunner) {
        throw new Error("開設チェックポイントが不正です (migrate.migrationRunner)");
      }
      const cursor = state.migrationCursor ?? 0;
      const manifest = await loadTrialReleaseManifest(config);
      const chunk = await runTrialMigrationChunk(
        token,
        accountId,
        databaseId,
        state.migrationRunner,
        manifest.migrations,
        cursor,
        budget,
      );
      const total = trialMigrationStatementCount(manifest.migrations, state.migrationRunner.mode);
      return {
        done: false,
        state: chunk.done
          ? { stage: "cleanup-migrations", databaseId }
          : {
              stage: "migrate",
              databaseId,
              migrationRunner: state.migrationRunner,
              migrationCursor: chunk.nextCursor,
            },
        progress: progress(
          "migrate",
          `データベースを初期化しています… (${Math.min(chunk.nextCursor, total)}/${total})`,
        ),
      };
    }

    case "cleanup-migrations": {
      const databaseId = requiredString(state, "databaseId");
      await cleanupTrialMigrationRunner(token, accountId, budget);
      return {
        done: false,
        state: { stage: "upload-assets", databaseId },
        progress: progress("migrate", "データベースの初期化が完了しました"),
      };
    }

    case "upload-assets": {
      const databaseId = requiredString(state, "databaseId");
      const manifest = await loadTrialReleaseManifest(config);
      const subdomain = await fetchWorkersSubdomain(token, accountId, budget);
      if (!subdomain) {
        throw new Error(
          "この Cloudflare アカウントで workers.dev サブドメインが未設定です。Workers の初回セットアップを完了してください。",
        );
      }
      const apiUrl = workerSubdomainUrl(manifest.apiWorkerName, subdomain);
      const publicUrl = workerSubdomainUrl(manifest.publicWorkerName, subdomain);
      await uploadWorkerAssets(
        token,
        accountId,
        manifest.apiWorkerName,
        manifest.adminAssets,
        async (manifestPath) => {
          const rel = manifestPath.replace(/^\//, "");
          return fetchTrialReleaseBytes(config, releaseUrl(releaseBaseUrl, `admin/${rel}`));
        },
        budget,
      );
      const secrets: TrialSecrets = {
        ASSET_UPLOAD_SECRET: randomTrialSecret(),
        PREVIEW_SECRET: randomTrialSecret(),
        MAIL_FORM_SECRET: randomTrialSecret(),
        MAIL_PRIVACY_SALT: randomTrialSecret(),
        BASER_BOOTSTRAP_SECRET: randomTrialSecret(),
      };
      return {
        done: false,
        state: {
          stage: "deploy-public-initial",
          databaseId,
          apiUrl,
          publicUrl,
          secrets,
        },
        progress: progress("build", "管理画面の配布物を準備しました"),
      };
    }

    case "deploy-public-initial": {
      const databaseId = requiredString(state, "databaseId");
      const publicUrl = requiredString(state, "publicUrl");
      requiredString(state, "apiUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const publicModule = await fetchTrialReleaseText(
        config,
        releaseUrl(releaseBaseUrl, manifest.publicModule),
      );
      await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
        d1DatabaseId: databaseId,
        workersDev: true,
        vars: {
          SITE_ID: "pending",
          ASSET_BASE_URL: "/assets",
          TURNSTILE_SITE_KEY: "",
        },
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
      return {
        done: false,
        state: { ...state, stage: "deploy-api-initial" },
        progress: progress("deploy", `公開Workerを配置しました (${publicUrl})`),
      };
    }

    case "deploy-api-initial": {
      const databaseId = requiredString(state, "databaseId");
      const apiUrl = requiredString(state, "apiUrl");
      const publicUrl = requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const apiModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.apiModule));
      // A completion token is single-use. Acquire it in the same resumable
      // stage that consumes it so a Queue redelivery always gets a fresh one.
      const assetsJwt = await uploadWorkerAssets(
        token,
        accountId,
        manifest.apiWorkerName,
        manifest.adminAssets,
        async (manifestPath) => {
          const rel = manifestPath.replace(/^\//, "");
          return fetchTrialReleaseBytes(config, releaseUrl(releaseBaseUrl, `admin/${rel}`));
        },
        budget,
      );
      await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
        d1DatabaseId: databaseId,
        assetsJwt,
        workersDev: true,
        vars: {
          BASER_ENV: "preview",
          PUBLIC_BASE_URL: apiUrl,
          PREVIEW_BASE_URL: publicUrl,
          PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
          BASER_INSTANT_LOGIN: "false",
          BASER_INSTANT_OWNER_HINT: "",
        },
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, {
        httpProbeUrl: `${apiUrl.replace(/\/$/, "")}/console/`,
        httpProbeOptions: {
          maxAttempts: TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS,
          expectedContentTypePrefix: "text/html",
        },
      });
      return {
        done: false,
        state: { ...state, stage: "secrets" },
        progress: progress("deploy", "API Workerを配置しました"),
      };
    }

    case "secrets": {
      const secrets = requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const apiSecrets: Record<string, string> = { ...secrets };
      if (config.cmsOAuth?.clientId && config.cmsOAuth.clientSecret) {
        apiSecrets.BASER_CF_OAUTH_CLIENT_ID = config.cmsOAuth.clientId;
        apiSecrets.BASER_CF_OAUTH_CLIENT_SECRET = config.cmsOAuth.clientSecret;
      }
      await putWorkerSecrets(token, accountId, manifest.apiWorkerName, apiSecrets, budget);
      await putWorkerSecrets(token, accountId, manifest.publicWorkerName, {
        PREVIEW_SECRET: secrets.PREVIEW_SECRET,
        MAIL_FORM_SECRET: secrets.MAIL_FORM_SECRET,
        MAIL_PRIVACY_SALT: secrets.MAIL_PRIVACY_SALT,
      }, budget);
      return {
        done: false,
        state: { ...state, stage: "verify-bootstrap-secret" },
        progress: progress("bootstrap", "サイト開設用の認証情報を反映しています…"),
      };
    }

    case "verify-bootstrap-secret": {
      const apiUrl = requiredString(state, "apiUrl");
      requiredString(state, "databaseId");
      requiredString(state, "publicUrl");
      const secrets = requiredSecrets(state);
      await waitForBootstrapSecret(apiUrl, secrets.BASER_BOOTSTRAP_SECRET, {
        maxAttempts: TRIAL_PROVISION_SECRET_PROBE_ATTEMPTS,
      });
      return {
        done: false,
        state: { ...state, stage: "bootstrap" },
        progress: progress("bootstrap", "サイト開設用の認証情報を確認しました"),
      };
    }

    case "bootstrap": {
      const apiUrl = requiredString(state, "apiUrl");
      requiredString(state, "databaseId");
      requiredString(state, "publicUrl");
      const secrets = requiredSecrets(state);
      const identity = await fetchTrialProvisionerIdentity(token, accountId);
      const bootstrap = await bootstrapTrialRemote(apiUrl, secrets.BASER_BOOTSTRAP_SECRET, identity);
      return {
        done: false,
        state: { ...state, stage: "deploy-public-final", bootstrap },
        progress: progress("bootstrap", "初期サイトを作成しました"),
      };
    }

    case "deploy-public-final": {
      const databaseId = requiredString(state, "databaseId");
      requiredString(state, "apiUrl");
      requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const publicModule = await fetchTrialReleaseText(
        config,
        releaseUrl(releaseBaseUrl, manifest.publicModule),
      );
      await putWorkerScript(token, accountId, manifest.publicWorkerName, "index.js", publicModule, {
        d1DatabaseId: databaseId,
        workersDev: true,
        vars: {
          SITE_ID: state.bootstrap?.siteId ?? "demo",
          ASSET_BASE_URL: "/assets",
          TURNSTILE_SITE_KEY: "",
        },
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.publicWorkerName, budget);
      return {
        done: false,
        state: { ...state, stage: "deploy-api-final" },
        progress: progress("deploy", "公開サイトを確定しました"),
      };
    }

    case "deploy-api-final": {
      const databaseId = requiredString(state, "databaseId");
      const apiUrl = requiredString(state, "apiUrl");
      const publicUrl = requiredString(state, "publicUrl");
      requiredSecrets(state);
      const manifest = await loadTrialReleaseManifest(config);
      const apiModule = await fetchTrialReleaseText(config, releaseUrl(releaseBaseUrl, manifest.apiModule));
      await putWorkerScript(token, accountId, manifest.apiWorkerName, "index.js", apiModule, {
        d1DatabaseId: databaseId,
        keepAssets: true,
        workersDev: true,
        vars: {
          BASER_ENV: "preview",
          PUBLIC_BASE_URL: apiUrl,
          PREVIEW_BASE_URL: publicUrl,
          PLUGIN_OUTBOUND_POLICY_ENFORCED: "false",
          BASER_INSTANT_LOGIN: "false",
          BASER_INSTANT_OWNER_HINT: "",
        },
      }, budget);
      await publishWorkerToWorkersDev(token, accountId, manifest.apiWorkerName, budget, {
        httpProbeUrl: `${apiUrl.replace(/\/$/, "")}/console/`,
        httpProbeOptions: {
          maxAttempts: TRIAL_PROVISION_ROUTE_PROBE_ATTEMPTS,
          expectedContentTypePrefix: "text/html",
        },
      });
      const consoleUrl = `${apiUrl.replace(/\/$/, "")}/console/`;
      return {
        done: true,
        result: { consoleUrl, publicUrl, apiUrl },
        progress: {
          step: "succeeded",
          message: "サイトの準備ができました",
          consoleUrl,
          publicUrl,
        },
      };
    }
  }
}
