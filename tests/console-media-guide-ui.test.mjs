import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const banner = readFileSync(join(root, "apps/admin-web/src/components/ConsoleCapabilitiesBanner.tsx"), "utf8");
const guide = readFileSync(join(root, "apps/admin-web/src/components/PublicMediaDeliveryGuide.tsx"), "utf8");

assert.doesNotMatch(banner, /assetPublicDelivery/);
assert.doesNotMatch(banner, /公開メディア配信/);

assert.match(guide, /assetPublicDelivery/);
assert.match(guide, /Cloudflare で R2 を有効化/);
assert.match(guide, /再アップロード/);
assert.match(guide, /Deploy to Cloudflare/);

console.log("console-media-guide-ui: ok");
