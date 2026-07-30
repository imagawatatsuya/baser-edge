import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const RECOVERABLE_WINDOWS_CODES = new Set(["EACCES", "EBUSY", "ENOTEMPTY", "EPERM"]);

function listFiles(root) {
  if (!existsSync(root)) return [];

  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function filesEqual(left, right) {
  if (!existsSync(right)) return false;
  if (statSync(left).size !== statSync(right).size) return false;
  return readFileSync(left).equals(readFileSync(right));
}

function copyFileIfChanged(source, destination, copyFile = copyFileSync) {
  if (filesEqual(source, destination)) return false;
  mkdirSync(dirname(destination), { recursive: true });
  copyFile(source, destination);
  return true;
}

/**
 * Publish one complete Vite build without deleting the stable dist directory.
 *
 * On Windows, a local server, virus scanner, or another SID can temporarily
 * keep a directory handle open. Vite's normal emptyOutDir then fails before it
 * can build. New hashed assets are copied first, index.html is updated, and
 * stale files are removed only as a best-effort cleanup.
 */
export function publishAdminBuild({
  stagingDir,
  distDir,
  copyFile = copyFileSync,
  removeFile = (path) => rmSync(path, { force: true }),
  logger = console,
}) {
  const stage = resolve(stagingDir);
  const dist = resolve(distDir);
  const stageIndex = join(stage, "index.html");
  if (!existsSync(stageIndex)) {
    throw new Error("admin-web build staging output is missing index.html");
  }

  const stageAssets = join(stage, "assets");
  const distAssets = join(dist, "console", "assets");
  const expectedAssets = new Set();
  const stagedFiles = listFiles(stage);
  const bundleFiles = stagedFiles.filter((source) => {
    const relativePath = relative(stage, source);
    return relativePath === "assets" || relativePath.startsWith(`assets${sep}`);
  });
  const rootFiles = stagedFiles.filter((source) => !bundleFiles.includes(source));

  mkdirSync(dist, { recursive: true });

  // Publish hashed bundles before index.html so readers never see an index that
  // points at an asset which has not reached the stable directory yet.
  for (const source of [...bundleFiles, ...rootFiles]) {
    const relativePath = relative(stage, source);
    const isBundle = relativePath === "assets" || relativePath.startsWith(`assets${sep}`);
    const destination = isBundle
      ? join(dist, "console", relativePath)
      : join(dist, relativePath);
    copyFileIfChanged(source, destination, copyFile);
    if (isBundle) expectedAssets.add(resolve(destination));
  }

  for (const stalePath of listFiles(distAssets)) {
    const resolvedStalePath = resolve(stalePath);
    if (expectedAssets.has(resolvedStalePath)) continue;
    try {
      removeFile(resolvedStalePath);
    } catch (error) {
      if (!RECOVERABLE_WINDOWS_CODES.has(error?.code)) throw error;
      logger.warn(
        `admin-web build: stale asset is temporarily locked; leaving it for a later build: ${resolvedStalePath}`,
      );
    }
  }

  return {
    indexHtml: join(dist, "index.html"),
    assetsDir: distAssets,
    stagedAssetCount: listFiles(stageAssets).length,
  };
}
