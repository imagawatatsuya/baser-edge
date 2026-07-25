import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const dir = join(root, "deploy", "onboarding-sessions");

export function createSession({ accountName, stackId }) {
  mkdirSync(dir, { recursive: true });
  const id = randomBytes(12).toString("hex");
  const session = {
    id,
    status: "queued",
    step: "queued",
    message: "待機中…",
    stackId,
    accountName: accountName ?? null,
    consoleUrl: null,
    publicUrl: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeSession(session);
  return session;
}

export function writeSession(session) {
  mkdirSync(dir, { recursive: true });
  session.updatedAt = Date.now();
  writeFileSync(join(dir, `${session.id}.json`), `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

export function loadSession(id) {
  const path = join(dir, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function updateSession(id, patch) {
  const session = loadSession(id);
  if (!session) return null;
  Object.assign(session, patch);
  writeSession(session);
  return session;
}
