import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const html = readFileSync(join(root, "docs", "start", "index.html"), "utf8");

assert.match(html, /お試しをはじめる/);
assert.match(html, /__TRIAL_ONBOARDING_START_URL__/);
assert.match(html, /__TRIAL_TEARDOWN_URL__/);
assert.match(html, /__GITHUB_REPOSITORY__/);
assert.match(html, /Cloudflare でログイン/);
assert.match(html, /<details class="card dev-only">/);
assert.match(html, /deploy\.workers\.cloudflare\.com/);
const main = html.split("<details")[0];
assert.doesNotMatch(main, /npm run prove/);
assert.match(html, /無料プラン/);
assert.doesNotMatch(main, /カード登録/);
assert.match(html, /お試しをはじめる/);

console.log("start-page-user-flow: ok");
