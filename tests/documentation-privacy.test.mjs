import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkoutParentName = basename(dirname(repoRoot));
const repositoryName = basename(repoRoot);
const skippedDirectories = new Set([
  ".baser",
  ".git",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "release",
]);
const personalHomePathPatterns = [
  /[A-Za-z]:[\\/]+Users[\\/]+([^<>%$\\/\s]+)[\\/]/gi,
  /\/Users\/([^<>$\/\s]+)\//g,
  /\/home\/([^<>$\/\s]+)\//g,
];
const allowedSystemNames = new Set(["default", "public"]);

function markdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") files.push(path);
  }
  return files;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function personalHomePathLines(source) {
  const lines = [];
  for (const pattern of personalHomePathPatterns) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
      if (allowedSystemNames.has(match[1].toLowerCase())) continue;
      lines.push(lineNumberAt(source, match.index));
    }
  }
  return lines.sort((left, right) => left - right);
}

function localCheckoutPathLines(source) {
  const pattern = new RegExp(
    `[\\\\/]${escapeRegExp(checkoutParentName)}[\\\\/]${escapeRegExp(repositoryName)}(?=[\\\\/\\s"'\\x60]|$)`,
    "gi",
  );
  return [...source.matchAll(pattern)].map((match) => lineNumberAt(source, match.index));
}

test("personal home path detector rejects Windows, macOS, and Linux usernames", () => {
  const source = [
    String.raw`cd C:\Users\sample-user\project`,
    "cd /Users/sample-user/project",
    "cd /home/sample-user/project",
  ].join("\n");
  assert.deepEqual(personalHomePathLines(source), [1, 2, 3]);
});

test("personal home path detector allows environment variables and placeholders", () => {
  const source = [
    String.raw`cd "%USERPROFILE%\project"`,
    "cd /Users/<username>/project",
    "cd /home/$USER/project",
  ].join("\n");
  assert.deepEqual(personalHomePathLines(source), []);
});

test("checkout path detector rejects this machine's repository parent directory", () => {
  const source = `C:\\workspace\\${checkoutParentName}\\${repositoryName}`;
  assert.deepEqual(localCheckoutPathLines(source), [1]);
  assert.deepEqual(localCheckoutPathLines(String.raw`C:\path\to\baser-edge`), []);
});

test("repository documentation does not expose environment-specific local paths", () => {
  const findings = [];

  for (const path of markdownFiles(repoRoot)) {
    const source = readFileSync(path, "utf8");
    const unsafeLines = new Set([
      ...personalHomePathLines(source),
      ...localCheckoutPathLines(source),
    ]);
    for (const line of unsafeLines) {
      findings.push(`${relative(repoRoot, path)}:${line}`);
    }
  }

  assert.deepEqual(
    findings,
    [],
    `Environment-specific local path found; replace it with an environment variable or placeholder:\n${findings.join("\n")}`,
  );
});
