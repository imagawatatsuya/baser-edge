/**
 * List OAuth scope IDs from GET /oauth/scopes (wrangler login required).
 * Usage: node scripts/cloudflare/list-oauth-scopes.mjs [filter-regex]
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const filterRe = new RegExp(process.argv[2] ?? "account-settings|workers-scripts|^d1\\.", "i");

function wranglerOAuthToken() {
  const tomlPath = join(homedir(), "AppData/Roaming/xdg.config/.wrangler/config/default.toml");
  const toml = readFileSync(tomlPath, "utf8");
  const m = toml.match(/oauth_token = "([^"]+)"/);
  if (!m) throw new Error("wrangler oauth_token not found — run wrangler login");
  return m[1];
}

const token = wranglerOAuthToken();
const all = [];
let page = 1;
let pages = 1;
while (page <= pages) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/oauth/scopes?per_page=100&page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await res.json();
  if (!j.success) {
    console.error(JSON.stringify(j.errors ?? j, null, 2));
    process.exit(1);
  }
  all.push(...j.result);
  pages = j.result_info?.total_count ? Math.ceil(j.result_info.total_count / 100) : page;
  page += 1;
}

const matches = all.filter((r) => filterRe.test(r.id) || filterRe.test(r.name));
console.log(matches.map((r) => `${r.id}\t${r.name}`).join("\n") || "(no matches)");
