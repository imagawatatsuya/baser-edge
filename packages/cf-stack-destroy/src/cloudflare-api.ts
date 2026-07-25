const CF_API = "https://api.cloudflare.com/client/v4";

export type CfApiError = { code: number; message: string };

export class CfApiCallError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: CfApiError[] = [],
  ) {
    super(message);
    this.name = "CfApiCallError";
  }
}

export type CfFetchBudget = {
  remaining: number;
  spend(n?: number): void;
};

export function createApiBudget(maxCalls: number): CfFetchBudget {
  let remaining = maxCalls;
  return {
    get remaining() {
      return remaining;
    },
    spend(n = 1) {
      if (remaining < n) throw new CfApiCallError("API call budget exceeded", 429);
      remaining -= n;
    },
  };
}

async function cfFetch(
  token: string,
  path: string,
  init: RequestInit,
  budget: CfFetchBudget,
): Promise<unknown> {
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
    errors?: CfApiError[];
    result?: unknown;
  };
  if (!res.ok || body.success === false) {
    const errors = body.errors ?? [];
    throw new CfApiCallError(
      errors[0]?.message ?? res.statusText ?? "Cloudflare API error",
      res.status,
      errors,
    );
  }
  return body.result;
}

export async function verifyToken(token: string, budget: CfFetchBudget): Promise<{ id: string; status: string }> {
  budget.spend(1);
  const res = await fetch(`${CF_API}/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { success: boolean; result?: { id: string; status: string }; errors?: CfApiError[] };
  if (!body.success || !body.result) {
    throw new CfApiCallError(body.errors?.[0]?.message ?? "Token verify failed", res.status, body.errors ?? []);
  }
  return body.result;
}

export async function listAccounts(token: string, budget: CfFetchBudget): Promise<{ id: string; name: string }[]> {
  const result = (await cfFetch(token, "/accounts", { method: "GET" }, budget)) as { id: string; name: string }[];
  return result ?? [];
}

export async function deleteWorkerScript(
  token: string,
  accountId: string,
  scriptName: string,
  budget: CfFetchBudget,
): Promise<boolean> {
  try {
    await cfFetch(token, `/accounts/${accountId}/workers/scripts/${scriptName}`, { method: "DELETE" }, budget);
    return true;
  } catch (e) {
    if (e instanceof CfApiCallError && (e.status === 404 || e.errors.some((x) => x.code === 10007))) {
      return false;
    }
    throw e;
  }
}

export async function findD1DatabaseId(
  token: string,
  accountId: string,
  name: string,
  budget: CfFetchBudget,
): Promise<string | null> {
  const list = (await cfFetch(token, `/accounts/${accountId}/d1/database`, { method: "GET" }, budget)) as {
    name: string;
    uuid: string;
  }[];
  const hit = list?.find((db) => db.name === name);
  return hit?.uuid ?? null;
}

export async function deleteD1Database(
  token: string,
  accountId: string,
  databaseId: string,
  budget: CfFetchBudget,
): Promise<boolean> {
  try {
    await cfFetch(token, `/accounts/${accountId}/d1/database/${databaseId}`, { method: "DELETE" }, budget);
    return true;
  } catch (e) {
    if (e instanceof CfApiCallError && e.status === 404) return false;
    throw e;
  }
}

export async function listR2ObjectKeys(
  token: string,
  accountId: string,
  bucket: string,
  limit: number,
  budget: CfFetchBudget,
): Promise<string[]> {
  const body = await cfFetch(
    token,
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects/list`,
    { method: "POST", body: JSON.stringify({ limit }) },
    budget,
  );
  const objects = (body as { objects?: { key: string }[] })?.objects ?? [];
  return objects.map((o) => o.key);
}

export async function deleteR2Object(
  token: string,
  accountId: string,
  bucket: string,
  key: string,
  budget: CfFetchBudget,
): Promise<void> {
  await cfFetch(
    token,
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
    { method: "DELETE" },
    budget,
  );
}

export async function deleteR2Bucket(
  token: string,
  accountId: string,
  bucket: string,
  budget: CfFetchBudget,
): Promise<boolean> {
  try {
    await cfFetch(token, `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}`, { method: "DELETE" }, budget);
    return true;
  } catch (e) {
    if (e instanceof CfApiCallError) {
      const code = e.errors[0]?.code;
      if (e.status === 404 || code === 10006) return false;
      if (code === 10008) {
        return false;
      }
    }
    throw e;
  }
}
