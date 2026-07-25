import { wranglerResult } from "./shared.mjs";

/** Returns true when the account can use R2 (subscription + API access). */
export function isR2Available() {
  const r = wranglerResult(["r2", "bucket", "list"], { silent: true });
  if (r.ok) return true;
  const text = `${r.stdout}\n${r.stderr}`.toLowerCase();
  if (text.includes("not entitled") || text.includes("enable r2") || text.includes("subscription")) {
    return false;
  }
  return false;
}
