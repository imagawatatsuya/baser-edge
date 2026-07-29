/**
 * Build a fresh tree with no .git history and no docs/internal — safe to push as a new public repo.
 * Usage: node scripts/release/prepare-public-snapshot.mjs [--init-git]
 */
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const defaultOutDir = join(repoRoot, "release", "public-snapshot");

const EXCLUDED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "public-snapshot",
  ".wrangler",
  ".mf",
  ".vite",
  ".turbo",
  ".cache",
  "_site",
  "coverage",
  ".nyc_output",
  "test-results",
  "playwright-report",
  "blob-report",
  "onboarding-sessions",
]);

const EXCLUDED_REL_FILES = new Set([
  "docs/deployment/private-repo-until-launch.md",
  "docs/deployment/trial-no-operator-burden.md",
  "docs/deployment/optional-hosted-start-page.md",
  "docs/deployment/public-trial-hosting.md",
  "deploy/cloudflare-state.json",
  "deploy/cloudflare-secrets.json",
]);

const SECRET_GLOBS = [".env", ".dev.vars"];

function normalizeRel(p) {
  return p.split(sep).join("/");
}

function shouldSkipPath(absPath) {
  const rel = normalizeRel(relative(repoRoot, absPath));
  if (!rel || rel.startsWith("..")) return true;
  if (rel === "docs/internal" || rel.startsWith("docs/internal/")) return true;
  if (EXCLUDED_REL_FILES.has(rel)) return true;
  for (const part of rel.split("/")) {
    if (EXCLUDED_DIR_NAMES.has(part)) return true;
  }
  const base = rel.split("/").pop() ?? "";
  if (SECRET_GLOBS.some((g) => base === g || base.startsWith(`${g}.`))) return true;
  if (base.endsWith(".pem") || base.endsWith(".key")) return true;
  if (rel.startsWith("release/public-snapshot")) return true;
  return false;
}

function scrubInternalContextEntries(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => !(
        entry
        && typeof entry === "object"
        && typeof entry.path === "string"
        && entry.path.startsWith("docs/internal/")
      ))
      .map(scrubInternalContextEntries);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, scrubInternalContextEntries(entry)]),
    );
  }
  return value;
}

export function scrubPublicMarkdown(relPath, content) {
  let out = content;

  if (relPath === "docs/README.md") {
    out = out.replace(
      /リポジトリを \*\*public\*\* にしたあとも、Git の履歴と `docs\/` 配下の旧版が残ります。\*\*いまの製品定義と矛盾する記述は、当時の設計メモや superseded 版であることがあります。\*\* 迷ったらこのページの「正本」だけを読んでください。\r?\n\r?\n/,
      "製品ドキュメントの入口です。迷ったらこのページの「正本」だけを読んでください。\n\n",
    );
  }

  out = out.replace(/\[([^\]]*)\]\([^)]*\/internal\/[^)]*\)/g, "$1");
  out = out.replace(/\[([^\]]*)\]\(\.\.\/internal\/[^)]*\)/g, "$1");
  out = out.replace(/`docs\/internal[^`]*`/g, "");
  out = out.replace(/^.*docs\/internal\/.*\r?\n/gm, "");
  out = out.replace(
    /^## 内部メモ（製品仕様ではない）\r?\n\r?\n[\s\S]*?(?=^## |\z)/m,
    "",
  );

  return out;
}

async function copyTree(srcRoot, destRoot) {
  async function walk(src) {
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      if (shouldSkipPath(srcPath)) continue;
      const destPath = join(destRoot, relative(srcRoot, srcPath));
      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await walk(srcPath);
      } else if (entry.isFile()) {
        await mkdir(join(destPath, ".."), { recursive: true });
        const rel = normalizeRel(relative(repoRoot, srcPath));
        if (rel.endsWith(".md")) {
          const raw = await readFile(srcPath, "utf8");
          await writeFile(destPath, scrubPublicMarkdown(rel, raw), "utf8");
        } else if (rel === ".agents/context/baseredge-context.snapshot.json") {
          const raw = JSON.parse(await readFile(srcPath, "utf8"));
          await writeFile(
            destPath,
            `${JSON.stringify(scrubInternalContextEntries(raw), null, 2)}\n`,
            "utf8",
          );
        } else {
          await cp(srcPath, destPath);
        }
      }
    }
  }
  await walk(srcRoot);
}

export async function verifyPublicSnapshot(outDir) {
  const problems = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git") continue;
        await walk(p);
      } else if (entry.isFile()) {
        const rel = normalizeRel(relative(outDir, p));
        if (rel.endsWith(".md") || rel.endsWith(".json") || rel.endsWith(".yml")) {
          const text = await readFile(p, "utf8");
          if (/docs\/internal|\/internal\/release-checklist/i.test(text)) {
            problems.push(`leaked internal reference: ${rel}`);
          }
        }
        const base = entry.name;
        if (base === ".env" || base.startsWith(".env.") || base === ".dev.vars") {
          problems.push(`secret-like file: ${rel}`);
        }
      }
    }
  }

  try {
    await stat(join(outDir, "package.json"));
  } catch {
    problems.push("missing package.json in snapshot");
  }

  try {
    await stat(join(outDir, "docs", "internal"));
    problems.push("docs/internal must not exist in snapshot");
  } catch {
    /* good */
  }

  await walk(outDir);
  return problems;
}

export async function preparePublicSnapshot(options = {}) {
  const outDir = options.outDir ?? defaultOutDir;
  const initGit = options.initGit ?? false;

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyTree(repoRoot, outDir);

  const instructions = `# Public snapshot (no private Git history)

This directory was generated by \`npm run prepare:public-snapshot\`.

- No commit history from the private repository is included.
- Maintainer-only documentation and deployment stubs are omitted.

## Publish to a new GitHub repository

\`\`\`bash
cd release/public-snapshot
git remote add origin git@github.com:YOUR_ORG/baser-edge.git
git push -u origin main
\`\`\`

Do **not** change the old private repository to Public — use this tree only.
`;

  await writeFile(join(outDir, "PUBLIC_SNAPSHOT.md"), instructions, "utf8");

  let problems = await verifyPublicSnapshot(outDir);
  if (problems.length > 0) {
    throw new Error(`Public snapshot verification failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  if (initGit) {
    const gitInit = spawnSync("git", ["init"], { cwd: outDir, encoding: "utf8" });
    if (gitInit.status !== 0) throw new Error(gitInit.stderr || "git init failed");
    const gitAdd = spawnSync("git", ["add", "-A"], { cwd: outDir, encoding: "utf8" });
    if (gitAdd.status !== 0) throw new Error(gitAdd.stderr || "git add failed");
    const gitCommit = spawnSync(
      "git",
      ["commit", "-m", "Initial public release (preview)"],
      { cwd: outDir, encoding: "utf8" },
    );
    if (gitCommit.status !== 0) throw new Error(gitCommit.stderr || "git commit failed");
    spawnSync("git", ["branch", "-M", "main"], { cwd: outDir, encoding: "utf8" });
    problems = await verifyPublicSnapshot(outDir);
    const history = spawnSync("git", ["rev-list", "--count", "HEAD"], {
      cwd: outDir,
      encoding: "utf8",
    });
    if (history.stdout.trim() !== "1") {
      throw new Error(`expected exactly 1 commit in snapshot repo, got ${history.stdout.trim()}`);
    }
  }

  return { outDir, initGit };
}

const isMain = process.argv[1]?.includes("prepare-public-snapshot.mjs");
if (isMain) {
  const initGit = process.argv.includes("--init-git");
  preparePublicSnapshot({ initGit })
    .then(({ outDir }) => {
      console.log(`Public snapshot ready: ${outDir}`);
      if (initGit) console.log("Fresh git repository with a single commit (no private history).");
      else console.log("Run with --init-git to create a one-commit repository here.");
    })
    .catch((err) => {
      console.error(err.message ?? err);
      process.exit(1);
    });
}
