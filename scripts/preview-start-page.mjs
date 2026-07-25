#!/usr/bin/env node
/**
 * スタートページをローカルプレビュー（Deploy ボタンは GitHub 上のリポジトリ URL が必要）。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const repo = process.env.GITHUB_REPOSITORY?.trim() || "OWNER/baser-edge";
const outDir = join(root, "deploy", "_preview", "start");
mkdirSync(outDir, { recursive: true });

let html = readFileSync(join(root, "docs", "start", "index.html"), "utf8");
html = html.replaceAll("__GITHUB_REPOSITORY__", repo);
writeFileSync(join(outDir, "index.html"), html, "utf8");

const css = readFileSync(join(root, "docs", "start", "start.css"), "utf8");
writeFileSync(join(outDir, "start.css"), css, "utf8");

console.log(`Preview: file://${join(outDir, "index.html").replace(/\\/g, "/")}`);
console.log(`Repository slug in Deploy URL: ${repo}`);
console.log("本番と同じ Deploy には GitHub Pages の /start/ を使ってください。");
