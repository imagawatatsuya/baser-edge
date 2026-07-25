#!/usr/bin/env node
/**
 * Vite base=/start/ emits dist/index.html + dist/assets/, but Workers Assets
 * serves paths literally. Nest under dist/start/ so /start/assets/* resolves.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
const startDir = join(dist, "start");

mkdirSync(startDir, { recursive: true });

const indexHtml = join(dist, "index.html");
if (!existsSync(indexHtml)) {
  console.error("postbuild-dist: dist/index.html missing — run vite build first");
  process.exit(1);
}
renameSync(indexHtml, join(startDir, "index.html"));

const assetsDir = join(dist, "assets");
if (existsSync(assetsDir)) {
  renameSync(assetsDir, join(startDir, "assets"));
}

console.log("postbuild-dist: nested dist/start/ for Workers Assets");
