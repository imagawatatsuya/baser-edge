#!/usr/bin/env node
/**
 * Pack pre-built worker bundles + admin assets for OAuth trial provision (no user GitHub).
 * Output: deploy/trial-release/ (copied into onboarding-web dist by postbuild-dist.mjs)
 */
import crypto from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import { unstable_splitSqlQuery } from "wrangler";
import { run } from "./shared.mjs";
import { d1DatabaseName, apiWorkerName, publicWorkerName } from "./stack.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const outRoot = join(root, "deploy", "trial-release");
const ASSET_HASH_FORMAT_VERSION = "baser-edge-static-assets-v2";

function assetContentType(manifestPath) {
  switch (extname(manifestPath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function assetHash(fileContent, manifestPath) {
  return crypto
    .createHash("sha256")
    .update(ASSET_HASH_FORMAT_VERSION)
    .update("\0")
    .update(assetContentType(manifestPath))
    .update("\0")
    .update(fileContent)
    .digest("hex")
    .slice(0, 32);
}

function walkFiles(dir, base = "") {
  const manifest = {};
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = walkFiles(full, rel);
      Object.assign(manifest, nested.manifest);
      files.push(...nested.files);
    } else if (entry.isFile()) {
      const content = readFileSync(full);
      const manifestPath = `/${rel.replace(/\\/g, "/")}`;
      manifest[manifestPath] = { hash: assetHash(content, manifestPath), size: content.length };
      files.push({ manifestPath, relPath: rel.replace(/\\/g, "/"), full });
    }
  }
  return { manifest, files };
}

async function bundleWorker(name, entry, destDir) {
  rmSync(destDir, { recursive: true, force: true });
  await viteBuild({
    configFile: false,
    root,
    logLevel: "warn",
    resolve: {
      preserveSymlinks: true,
    },
    ssr: {
      noExternal: true,
    },
    build: {
      ssr: join(root, entry),
      outDir: destDir,
      emptyOutDir: true,
      target: "es2022",
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          format: "es",
          inlineDynamicImports: true,
        },
      },
    },
  });
  const js = join(destDir, "index.js");
  if (!existsSync(js)) throw new Error(`Missing ${name} bundle ${js}`);
}

function packMigrations() {
  const migDir = join(root, "migrations");
  const names = readdirSync(migDir)
    .filter((n) => n.endsWith(".sql"))
    .sort();
  return names.map((name) => {
    const sql = readFileSync(join(migDir, name), "utf8");
    const statements = unstable_splitSqlQuery(sql)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.endsWith(";") ? s : `${s};`));
    return { name, statements };
  });
}

async function main() {
  process.chdir(root);
  process.env.BASER_CF_STACK = "trial";
  process.env.BASER_TRIAL_NO_R2 = "1";

  console.log("Building packages for trial release…");
  run("npm", ["run", "build"]);
  run("npm", ["run", "build:admin-web"]);

  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  const apiBundle = join(outRoot, "api-bundle");
  const publicBundle = join(outRoot, "public-bundle");
  await bundleWorker("api", "apps/api-worker/dist/index.js", apiBundle);
  await bundleWorker(
    "public",
    "apps/public-renderer/dist/index.js",
    publicBundle,
  );

  const adminSrc = join(root, "apps", "admin-web", "dist");
  if (!existsSync(adminSrc)) throw new Error("admin-web dist missing");
  const adminDest = join(outRoot, "admin-assets");
  cpSync(adminSrc, adminDest, { recursive: true });
  const { manifest: adminManifest, files: adminFiles } = walkFiles(adminDest);

  const apiJs = readFileSync(join(apiBundle, "index.js"));
  const publicJs = readFileSync(join(publicBundle, "index.js"));
  writeFileSync(join(outRoot, "api-index.js"), apiJs);
  writeFileSync(join(outRoot, "public-index.js"), publicJs);

  for (const f of adminFiles) {
    const dest = join(outRoot, "admin", f.relPath);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(f.full, dest);
  }

  const manifest = {
    version: readFileSync(join(root, "package.json"), "utf8").match(/"version":\s*"([^"]+)"/)?.[1] ?? "0.0.0",
    d1DatabaseName: d1DatabaseName(),
    apiWorkerName: apiWorkerName(),
    publicWorkerName: publicWorkerName(),
    apiModule: "api-index.js",
    publicModule: "public-index.js",
    adminAssets: adminManifest,
    migrations: packMigrations(),
  };

  writeFileSync(join(outRoot, "manifest.json"), JSON.stringify(manifest), "utf8");
  console.log(`Packed trial release → ${relative(root, outRoot)} (${adminFiles.length} admin files)`);
}

await main();
