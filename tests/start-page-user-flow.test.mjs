import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const html = readFileSync(join(root, "docs", "start", "index.html"), "utf8");

assert.match(html, /Deploy to Cloudflare/);
assert.match(html, /deploy\.workers\.cloudflare\.com/);
assert.match(html, /__GITHUB_REPOSITORY__/);
assert.match(html, /管理をはじめる/);
assert.match(html, /<details class="card dev-only">/);
// CLI は折りたたみ内のみ
const main = html.split("<details")[0];
assert.doesNotMatch(main, /npm run prove/);

console.log("start-page-user-flow: ok");
