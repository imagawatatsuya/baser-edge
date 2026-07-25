import { randomBytes } from "node:crypto";

const pendingStates = new Map();
const grants = new Map();
const TTL_MS = 15 * 60 * 1000;

function purge() {
  const now = Date.now();
  for (const [k, v] of pendingStates) {
    if (v.expiresAt < now) pendingStates.delete(k);
  }
  for (const [k, v] of grants) {
    if (v.expiresAt < now) grants.delete(k);
  }
}

/** @param {"deploy" | "destroy"} intent */
export function savePendingState(state, codeVerifier, intent = "deploy") {
  purge();
  pendingStates.set(state, { codeVerifier, intent, expiresAt: Date.now() + TTL_MS });
}

export function takePendingState(state) {
  purge();
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.expiresAt < Date.now()) return null;
  return { codeVerifier: entry.codeVerifier, intent: entry.intent ?? "deploy" };
}

export function issueGrant(accessToken) {
  purge();
  const id = randomBytes(16).toString("hex");
  grants.set(id, { accessToken, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function takeGrant(id) {
  purge();
  const entry = grants.get(id);
  if (!entry) return null;
  grants.delete(id);
  if (entry.expiresAt < Date.now()) return null;
  return entry.accessToken;
}
