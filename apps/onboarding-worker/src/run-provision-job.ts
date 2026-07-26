import { runTrialProvision, runTrialProvisionRelease, type TrialProvisionConfig } from "@baser-edge/cf-trial-provision";

type ProvisionEnv = {
  BASER_TRIAL_PROVISION_MODE?: string;
  BASER_TRIAL_PROVISION_STRATEGY?: string;
  BASER_TRIAL_RELEASE_BASE_URL?: string;
  BASER_TRIAL_BUILDS_REPO?: string;
  BASER_TRIAL_BUILDS_BRANCH?: string;
  BASER_TRIAL_BUILDS_ROOT?: string;
  BASER_TRIAL_BUILDS_BUILD_CMD?: string;
  BASER_TRIAL_BUILDS_DEPLOY_CMD?: string;
  GITHUB_REPO?: string;
};

type SessionPatch = {
  status?: string;
  step?: string;
  message?: string;
  consoleUrl?: string | null;
  publicUrl?: string | null;
  error?: string | null;
};

export function provisionMode(env: ProvisionEnv): "cloudflare" | "github" {
  const v = env.BASER_TRIAL_PROVISION_MODE?.trim().toLowerCase();
  if (v === "github" || v === "github_actions") return "github";
  return "cloudflare";
}

/** release = pre-built artifacts (no user GitHub). builds = Workers Builds (needs GitHub on CF account). */
export function provisionStrategy(env: ProvisionEnv): "release" | "builds" {
  const v = env.BASER_TRIAL_PROVISION_STRATEGY?.trim().toLowerCase();
  if (v === "builds" || v === "workers_builds") return "builds";
  return "release";
}

export function trialReleaseBaseUrl(env: ProvisionEnv, requestOrigin: string): string {
  const configured = env.BASER_TRIAL_RELEASE_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${requestOrigin.replace(/\/$/, "")}/trial-release`;
}

export function trialBuildsConfig(env: ProvisionEnv, accountId: string): TrialProvisionConfig {
  const repo = env.BASER_TRIAL_BUILDS_REPO?.trim() || env.GITHUB_REPO?.trim() || "imagawatatsuya/baser-edge";
  const branch = env.BASER_TRIAL_BUILDS_BRANCH?.trim() || "main";
  return {
    accountId,
    buildsRepo: repo,
    buildsBranch: branch,
    buildsRootDirectory: env.BASER_TRIAL_BUILDS_ROOT?.trim() || "/",
    buildCommand:
      env.BASER_TRIAL_BUILDS_BUILD_CMD?.trim() || "npm ci && npm run build && npm run build:admin-web",
    deployCommand: env.BASER_TRIAL_BUILDS_DEPLOY_CMD?.trim() || "node deploy/one-click/deploy.mjs",
  };
}

export function createTrialReleaseFetch(assets: Fetcher, origin: string): typeof fetch {
  const originUrl = new URL(origin.replace(/\/$/, "") + "/");
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    if (url.origin === originUrl.origin && url.pathname.startsWith("/trial-release/")) {
      return assets.fetch(new Request(url.toString(), req));
    }
    return fetch(req);
  };
}

export async function runCloudflareProvisionJob(
  env: ProvisionEnv,
  apiToken: string,
  accountId: string,
  requestOrigin: string,
  patch: (body: SessionPatch) => Promise<void>,
  releaseFetch?: typeof fetch,
): Promise<void> {
  try {
    await patch({ status: "running", step: "connect", message: "Cloudflare に接続しました" });
    const strategy = provisionStrategy(env);
    if (strategy === "release") {
      await runTrialProvisionRelease(
        apiToken,
        {
          accountId,
          releaseBaseUrl: trialReleaseBaseUrl(env, requestOrigin),
          httpFetch: releaseFetch,
        },
        async (event) => {
          await patch({
            status: event.step === "succeeded" ? "succeeded" : "running",
            step: event.step,
            message: event.message ?? "",
            consoleUrl: event.consoleUrl ?? null,
            publicUrl: event.publicUrl ?? null,
          });
        },
      );
    } else {
      await runTrialProvision(apiToken, trialBuildsConfig(env, accountId), async (event) => {
        await patch({
          status: event.step === "succeeded" ? "succeeded" : "running",
          step: event.step,
          message: event.message ?? "",
          consoleUrl: event.consoleUrl ?? null,
          publicUrl: event.publicUrl ?? null,
        });
      });
    }
  } catch (e) {
    let message = e instanceof Error ? e.message : String(e);
    if (message === "Not found") {
      message =
        "Cloudflare API がリソースを見つけられませんでした。お試しをやめる → 再開設をお試しください。";
    }
    console.error(JSON.stringify({
      event: "trial_provision_failed",
      strategy: provisionStrategy(env),
      accountIdSuffix: accountId.slice(-6),
      error: message,
    }));
    await patch({
      status: "failed",
      step: "failed",
      message: "開設に失敗しました",
      error: message,
    }).catch(() => {});
  }
}
