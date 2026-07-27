import { parseWranglerJson, d1QueryRemote } from "./apply-d1-migrations.mjs";
import { bootstrapRemote } from "./remote-demo.mjs";
import { apiWorkerName, publicWorkerName } from "./stack.mjs";
import { readWranglerWhoami, wranglerResult } from "./shared.mjs";

function parseWranglerObject(stdout) {
  const trimmed = stdout.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const start = stdout.indexOf("{");
  if (start >= 0) return JSON.parse(stdout.slice(start));
  return parseWranglerJson(stdout);
}

function siteIdFromVersionBindings(bindings) {
  if (!Array.isArray(bindings)) return null;
  const row = bindings.find((b) => b?.name === "SITE_ID" && b?.type === "plain_text");
  const text = row?.text;
  if (typeof text !== "string" || !text.trim() || text === "pending" || text === "REPLACE_ME") return null;
  return text.trim();
}

function readSiteIdFromDeployedPublicWorker(workerName) {
  const list = wranglerResult(["versions", "list", "--name", workerName, "--json"], {
    silent: true,
    env: { ...process.env, CI: "true", WRANGLER_CI: "1" },
  });
  if (!list.ok) return null;
  const versions = parseWranglerJson(list.stdout);
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const latest = versions[versions.length - 1];
  const versionId = latest?.id;
  if (!versionId) return null;
  const view = wranglerResult(["versions", "view", versionId, "--name", workerName, "--json"], {
    silent: true,
    env: { ...process.env, CI: "true", WRANGLER_CI: "1" },
  });
  if (!view.ok) return null;
  try {
    const detail = parseWranglerObject(view.stdout);
    return siteIdFromVersionBindings(detail?.resources?.bindings);
  } catch {
    return null;
  }
}

function subdomainCandidatesFromWhoami(whoami) {
  const out = new Set();
  const emailLocal = whoami?.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (emailLocal) out.add(emailLocal);
  for (const account of whoami?.accounts ?? []) {
    const name = account?.name?.split("'")[0]?.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (name) out.add(name);
  }
  return [...out];
}

export async function probeWorkersDevUrl(workerName) {
  const fixed = process.env.BASER_TRIAL_API_URL?.trim() || process.env.BASER_OAUTH_TRIAL_API_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");

  let whoami;
  try {
    whoami = readWranglerWhoami();
  } catch {
    whoami = null;
  }
  const candidates = subdomainCandidatesFromWhoami(whoami);
  const hosts = [
    ...candidates.map((sub) => `https://${workerName}.${sub}.workers.dev`),
    `https://${workerName}.workers.dev`,
  ];
  for (const base of hosts) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return base;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * @param {{ siteId?: string | null, apiUrl?: string | null, d1DatabaseId?: string | null }} state
 */
export async function resolveOAuthTrialSiteId(state, dbName, log = console.log) {
  const envOverride = process.env.BASER_TRIAL_SITE_ID?.trim();
  if (envOverride) {
    log(`Using BASER_TRIAL_SITE_ID: ${envOverride}`);
    return envOverride;
  }
  if (state.siteId?.trim()) return state.siteId.trim();

  const fromWorker = readSiteIdFromDeployedPublicWorker(publicWorkerName());
  if (fromWorker) {
    log(`Resolved SITE_ID from deployed ${publicWorkerName()}: ${fromWorker}`);
    return fromWorker;
  }

  const rows = d1QueryRemote(dbName, "SELECT id FROM sites ORDER BY created_at ASC LIMIT 1;");
  const fromD1 = rows[0]?.id;
  if (typeof fromD1 === "string" && fromD1.trim()) {
    log(`Resolved SITE_ID from D1: ${fromD1}`);
    return fromD1.trim();
  }

  const apiUrl = state.apiUrl?.trim() || (await probeWorkersDevUrl(apiWorkerName()));
  if (!apiUrl) {
    throw new Error(
      `No site in D1 ${dbName}. Set BASER_TRIAL_API_URL (e.g. https://baser-edge-api-trial.<account>.workers.dev) or BASER_TRIAL_SITE_ID.`,
    );
  }

  log(`No site row in D1; calling bootstrap on ${apiUrl}…`);
  const boot = await bootstrapRemote(apiUrl);
  if (boot?.siteId) {
    log(`Bootstrap created site: ${boot.siteId}`);
    return boot.siteId;
  }

  const rowsAfter = d1QueryRemote(dbName, "SELECT id FROM sites ORDER BY created_at ASC LIMIT 1;");
  const after = rowsAfter[0]?.id;
  if (typeof after === "string" && after.trim()) {
    log(`Resolved SITE_ID from D1 after bootstrap: ${after}`);
    return after.trim();
  }

  const workspaceRows = d1QueryRemote(dbName, "SELECT id FROM workspaces LIMIT 1;");
  if (workspaceRows.length > 0) {
    throw new Error(
      `D1 ${dbName} has a workspace but no site. Open ${apiUrl}/console/ once, or set BASER_TRIAL_SITE_ID.`,
    );
  }

  throw new Error(
    `No site in D1 ${dbName}. Complete OAuth trial provision from the trial host /start/, then re-run refresh:oauth-trial.`,
  );
}
