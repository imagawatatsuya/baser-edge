import {
  CfApiCallError,
  createApiBudget,
  deleteD1Database,
  deleteR2Bucket,
  deleteR2Object,
  deleteWorkerScript,
  findD1DatabaseId,
  listAccounts,
  listR2ObjectKeys,
} from "./cloudflare-api.js";
import {
  TRIAL_API_WORKER,
  TRIAL_D1_NAME,
  TRIAL_PUBLIC_WORKER,
  TRIAL_R2_BUCKET,
  TRIAL_STACK_ID,
  isAllowedTrialStackId,
} from "./trial-names.js";

export type DestroyTrialOptions = {
  dryRun?: boolean;
  maxApiCalls?: number;
  maxR2ObjectDeletes?: number;
  skipR2?: boolean;
};

export type DestroyTrialResult = {
  stackId: string;
  accountId: string;
  dryRun: boolean;
  removed: {
    apiWorker: boolean;
    publicWorker: boolean;
    d1: boolean;
    r2Bucket: boolean;
    r2ObjectsDeleted: number;
  };
  partialR2: boolean;
  apiCallsUsed: number;
};

export type DestroyTrialErrorCode =
  | "INVALID_STACK"
  | "API_BUDGET"
  | "R2_PARTIAL"
  | "CF_API";

export class DestroyTrialError extends Error {
  constructor(
    message: string,
    readonly code: DestroyTrialErrorCode,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DestroyTrialError";
  }
}

export async function destroyTrialStack(
  apiToken: string,
  accountId: string,
  stackId: string,
  options: DestroyTrialOptions = {},
): Promise<DestroyTrialResult> {
  if (!isAllowedTrialStackId(stackId)) {
    throw new DestroyTrialError(`Stack "${stackId}" is not allowed for cloud operations`, "INVALID_STACK");
  }

  const maxApiCalls = options.maxApiCalls ?? 50;
  const maxR2Deletes = options.maxR2ObjectDeletes ?? 200;
  const dryRun = options.dryRun === true;
  const budget = createApiBudget(maxApiCalls);

  const removed = {
    apiWorker: false,
    publicWorker: false,
    d1: false,
    r2Bucket: false,
    r2ObjectsDeleted: 0,
  };

  try {
    if (!dryRun) {
      removed.apiWorker = await deleteWorkerScript(apiToken, accountId, TRIAL_API_WORKER, budget);
      removed.publicWorker = await deleteWorkerScript(apiToken, accountId, TRIAL_PUBLIC_WORKER, budget);
    } else {
      removed.apiWorker = true;
      removed.publicWorker = true;
    }

    if (dryRun) {
      removed.d1 = true;
    } else {
      const d1Id = await findD1DatabaseId(apiToken, accountId, TRIAL_D1_NAME, budget);
      if (d1Id) removed.d1 = await deleteD1Database(apiToken, accountId, d1Id, budget);
    }

    let partialR2 = false;
    if (!options.skipR2) {
      if (!dryRun) {
        const keys = await listR2ObjectKeys(apiToken, accountId, TRIAL_R2_BUCKET, Math.min(maxR2Deletes, 1000), budget);
        const toDelete = keys.slice(0, maxR2Deletes);
        if (keys.length > toDelete.length) partialR2 = true;
        for (const key of toDelete) {
          if (budget.remaining <= 0) {
            partialR2 = true;
            break;
          }
          await deleteR2Object(apiToken, accountId, TRIAL_R2_BUCKET, key, budget);
          removed.r2ObjectsDeleted += 1;
        }
        if (!partialR2 && removed.r2ObjectsDeleted === keys.length) {
          removed.r2Bucket = await deleteR2Bucket(apiToken, accountId, TRIAL_R2_BUCKET, budget);
        } else if (removed.r2ObjectsDeleted > 0) {
          partialR2 = true;
        }
      } else {
        removed.r2Bucket = true;
      }
    }

    return {
      stackId: TRIAL_STACK_ID,
      accountId,
      dryRun,
      removed,
      partialR2,
      apiCallsUsed: maxApiCalls - budget.remaining,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "API call budget exceeded") {
      throw new DestroyTrialError("Cloudflare API call budget exceeded", "API_BUDGET", e);
    }
    if (e instanceof CfApiCallError) {
      throw new DestroyTrialError(e.message, "CF_API", e);
    }
    throw e;
  }
}

export async function resolveSingleAccountId(apiToken: string, budgetMax = 5): Promise<string> {
  const budget = createApiBudget(budgetMax);
  const accounts = await listAccounts(apiToken, budget);
  if (accounts.length !== 1) {
    throw new DestroyTrialError(
      accounts.length === 0
        ? "No Cloudflare account visible for this token"
        : "Multiple Cloudflare accounts; use a token scoped to one account",
      "CF_API",
    );
  }
  return accounts[0].id;
}

export { TRIAL_STACK_ID, isAllowedTrialStackId };
