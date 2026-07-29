#!/usr/bin/env node
/**
 * Workers Static Assets resolves URL paths literally. Keep /index.html at the
 * asset root for SPA fallback and nest bundles under /console/assets/*.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
const consoleDir = join(dist, "console");
const indexHtml = join(dist, "index.html");

if (!existsSync(indexHtml)) {
  console.error("postbuild-dist: dist/index.html missing — run vite build first");
  process.exit(1);
}

mkdirSync(consoleDir, { recursive: true });
const assetsDir = join(dist, "assets");
if (existsSync(assetsDir)) renameSync(assetsDir, join(consoleDir, "assets"));

console.log("postbuild-dist: kept /index.html and nested /console/assets/");
