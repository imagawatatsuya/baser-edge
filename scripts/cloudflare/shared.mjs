import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  resolveStatePath,
  d1DatabaseName,
  r2BucketName,
  wranglerApiConfigRel,
  wranglerPublicConfigRel,
} from "./stack.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
export { root };

/** User-facing paths only (never absolute home / Users / x:/...). */
export function displayPath(absPath) {
  const rel = relative(root, absPath);
  if (!rel || rel.startsWith("..")) return "deploy/cloudflare-state.json";
  return rel.split("\\").join("/");
}

export const statePath = resolveStatePath();
/** @deprecated use wranglerApiPath() */
export const wranglerApi = join(root, "wrangler.jsonc");
/** @deprecated use wranglerPublicPath() */
export const wranglerPublic = join(root, "wrangler.public.jsonc");

export function wranglerApiPath() {
  return join(root, wranglerApiConfigRel());
}

export function wranglerPublicPath() {
  return join(root, wranglerPublicConfigRel());
}

export function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: opts.stdin !== undefined ? ["pipe", opts.silent ? "pipe" : "inherit", opts.silent ? "pipe" : "inherit"] : opts.silent ? "pipe" : "inherit",
    input: opts.stdin,
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "";
    throw new Error(`${cmd} ${args.join(" ")} failed (${result.status}): ${detail}`);
  }
  return result.stdout ?? "";
}

export function wrangler(args, opts) {
  return run("npx", ["wrangler", ...args], opts);
}

/** Skips wrangler confirmation prompts (e.g. d1 migrations apply). */
export function wranglerNonInteractive(args, opts = {}) {
  return wrangler(args, {
    ...opts,
    env: { ...process.env, CI: "true", WRANGLER_CI: "1", ...opts.env },
  });
}

/** Like wrangler() but does not throw on non-zero exit (for idempotent provision steps). */
export function wranglerResult(args, opts = {}) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: opts.silent ? "pipe" : "inherit",
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

export function loadState() {
  if (!existsSync(statePath)) return null;
  return JSON.parse(readFileSync(statePath, "utf8"));
}

export function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function patchWranglerDatabaseId(databaseId) {
  patchWranglerBindings({ databaseId });
}

export function patchWranglerBindings({ databaseId, d1Name, r2Name } = {}) {
  const dbName = d1Name ?? d1DatabaseName();
  const bucket = r2Name ?? r2BucketName();
  const wranglerConfigs = [
    join(root, "wrangler.jsonc"),
    join(root, "wrangler.trial.jsonc"),
    join(root, "wrangler.public.jsonc"),
    join(root, "wrangler.public.trial.jsonc"),
  ];
  for (const file of wranglerConfigs) {
    if (!existsSync(file)) continue;
    let text = readFileSync(file, "utf8");
    if (!/"d1_databases"/.test(text)) continue;
    if (databaseId) {
      text = text.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${databaseId}"`);
    }
    text = text.replace(/"database_name":\s*"[^"]*"/, `"database_name": "${dbName}"`);
    if (/"bucket_name"/.test(text)) {
      text = text.replace(/"bucket_name":\s*"[^"]*"/, `"bucket_name": "${bucket}"`);
    }
    writeFileSync(file, text, "utf8");
  }
}

export function patchPublicSiteId(siteId) {
  let text = readFileSync(wranglerPublicPath(), "utf8");
  text = text.replace(/"SITE_ID":\s*"REPLACE_ME"/, `"SITE_ID": "${siteId}"`);
  writeFileSync(wranglerPublicPath(), text, "utf8");
}

export function randomSecret() {
  return randomBytes(32).toString("base64url");
}

export function ensureLoggedIn() {
  const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim());
  try {
    wrangler(["whoami"], { silent: true });
  } catch {
    if (hasToken) {
      throw new Error("CLOUDFLARE_API_TOKEN が無効です。ダッシュボードでトークンを再作成してください。");
    }
    throw new Error("Cloudflare に未ログインです。npx wrangler login または CLOUDFLARE_API_TOKEN を設定してください。");
  }
}

/** Opens the system browser to wrangler login when CLI is not authenticated. */
export function ensureLoggedInWithBrowser() {
  const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim());
  try {
    wrangler(["whoami"], { silent: true });
    return;
  } catch {
    if (hasToken) {
      throw new Error("CLOUDFLARE_API_TOKEN が無効です。ダッシュボードでトークンを再作成してください。");
    }
  }
  console.log("ブラウザで Cloudflare にログインします…");
  wrangler(["login"]);
  wrangler(["whoami"], { silent: true });
}

export function readWranglerWhoami() {
  const raw = wrangler(["whoami", "--json"], { silent: true });
  return JSON.parse(raw);
}

export function openInBrowser(url) {
  const target = String(url);
  if (process.platform === "win32") {
    run("cmd", ["/c", "start", "", target], { silent: true });
    return;
  }
  if (process.platform === "darwin") {
    run("open", [target], { silent: true });
    return;
  }
  run("xdg-open", [target], { silent: true });
}
