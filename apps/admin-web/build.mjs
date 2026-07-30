#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { publishAdminBuild } from "./build-output.mjs";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "..", "..");
const stagingRoot = join(repoRoot, ".baser", "build-staging");
mkdirSync(stagingRoot, { recursive: true });
const stagingDir = mkdtempSync(join(stagingRoot, "admin-web-"));

try {
  await build({
    root: appDir,
    configFile: join(appDir, "vite.config.ts"),
    configLoader: "runner",
    build: {
      outDir: stagingDir,
      emptyOutDir: true,
    },
  });

  const published = publishAdminBuild({
    stagingDir,
    distDir: join(appDir, "dist"),
  });
  console.log(
    `admin-web build: published index.html and ${published.stagedAssetCount} bundle asset(s) without replacing dist/console`,
  );
} finally {
  try {
    rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.warn(
      `admin-web build: staging cleanup deferred (${error?.code ?? "unknown"}): ${stagingDir}`,
    );
  }
}
