import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function rel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

export function walkFiles(dir, ignore = new Set(["node_modules", ".git", "dist", ".baser"])) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out.sort();
}

function expandWorkspacePattern(root, pattern) {
  if (!pattern.includes("*")) {
    const full = path.join(root, pattern);
    return fs.existsSync(full) ? [full] : [];
  }
  const before = pattern.slice(0, pattern.indexOf("*")).replace(/[\\/]+$/, "");
  const after = pattern.slice(pattern.indexOf("*") + 1).replace(/^[\\/]+/, "");
  const parent = path.join(root, before);
  if (!fs.existsSync(parent)) return [];
  return fs.readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name, after))
    .filter((candidate) => fs.existsSync(candidate));
}

function markdownLinks(file, root) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const links = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].split("#")[0].trim();
    if (!raw || /^(https?:|mailto:|#)/i.test(raw)) continue;
    const resolved = path.resolve(path.dirname(file), raw);
    if (resolved.startsWith(root) && fs.existsSync(resolved) && resolved.endsWith(".md")) {
      links.push(resolved);
    }
  }
  return [...new Set(links)];
}

function discoverAuthorityFiles(root, registry) {
  const map = new Map();
  const queue = [];
  for (const item of registry.seedFiles) {
    const full = path.join(root, item.path);
    if (fs.existsSync(full)) {
      map.set(path.resolve(full), { severity: item.severity, ids: [item.id] });
      queue.push({ file: path.resolve(full), depth: 0 });
    } else if (item.required) {
      map.set(path.resolve(full), { severity: "missing", ids: [item.id] });
    }
  }

  const maxDepth = registry.linkDiscovery?.maxDepth ?? 1;
  while (queue.length) {
    const { file, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    for (const linked of markdownLinks(file, root)) {
      if (!map.has(linked)) {
        map.set(linked, { severity: "review", ids: ["linked-authority"] });
        queue.push({ file: linked, depth: depth + 1 });
      }
    }
  }

  const families = [];
  for (const family of registry.versionFamilies ?? []) {
    const dir = path.join(root, family.directory);
    const regex = new RegExp(family.pattern);
    const matches = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((name) => regex.test(name)).sort()
      : [];
    const active = matches.filter((name) => map.has(path.resolve(dir, name)));
    families.push({
      id: family.id,
      severity: family.severity,
      all: matches.map((name) => `${family.directory}/${name}`),
      active: active.map((name) => `${family.directory}/${name}`)
    });
  }

  const files = [...map.entries()].map(([file, meta]) => ({
    path: rel(root, file),
    severity: meta.severity,
    ids: meta.ids,
    exists: fs.existsSync(file),
    sha256: fs.existsSync(file) ? sha256File(file) : null
  })).sort((a, b) => a.path.localeCompare(b.path));

  return { files, families };
}

function workspaceInventory(root) {
  const rootPackageFile = path.join(root, "package.json");
  if (!fs.existsSync(rootPackageFile)) {
    throw new Error(`package.json not found at repository root: ${root}`);
  }
  const rootPackage = readJson(rootPackageFile);
  const patterns = Array.isArray(rootPackage.workspaces)
    ? rootPackage.workspaces
    : (rootPackage.workspaces?.packages ?? []);
  const dirs = [...new Set(patterns.flatMap((pattern) => expandWorkspacePattern(root, pattern)))];
  const workspaces = [];
  for (const dir of dirs) {
    const packageFile = path.join(dir, "package.json");
    if (!fs.existsSync(packageFile)) continue;
    const pkg = readJson(packageFile);
    workspaces.push({
      path: rel(root, dir),
      name: pkg.name ?? null,
      version: pkg.version ?? null,
      description: pkg.description ?? null,
      scripts: Object.keys(pkg.scripts ?? {}).sort()
    });
  }
  return {
    rootScripts: Object.keys(rootPackage.scripts ?? {}).sort(),
    workspacePatterns: patterns,
    workspaces: workspaces.sort((a, b) => a.path.localeCompare(b.path))
  };
}

function resolveRoles(workspace, roleRegistry) {
  const results = [];
  for (const role of roleRegistry.roles) {
    const matches = workspace.workspaces.filter((ws) => {
      const basename = path.posix.basename(ws.path).toLowerCase();
      const name = (ws.name ?? "").toLowerCase();
      const description = (ws.description ?? "").toLowerCase();
      return role.packageNames.some((candidate) => candidate.toLowerCase() === name)
        || role.pathHints.some((hint) => basename.includes(hint.toLowerCase()))
        || role.keywords.some((keyword) => description.includes(keyword.toLowerCase()));
    }).map((ws) => ({ path: ws.path, packageName: ws.name }));
    results.push({
      id: role.id,
      required: role.required,
      matches,
      resolved: matches.length > 0
    });
  }
  return results;
}

function hashInventory(root, matcher) {
  return walkFiles(root)
    .filter((file) => matcher(rel(root, file)))
    .map((file) => ({ path: rel(root, file), sha256: sha256File(file) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function buildContext(root) {
  const authorityRegistry = readJson(path.join(root, "docs/agents/adaptation/authority-registry.json"));
  const roleRegistry = readJson(path.join(root, "docs/agents/adaptation/component-role-registry.json"));
  const workspace = workspaceInventory(root);
  const authorities = discoverAuthorityFiles(root, authorityRegistry);
  const roles = resolveRoles(workspace, roleRegistry);

  const wrangler = hashInventory(root, (p) => /(^|\/)wrangler[^/]*\.(jsonc?|toml)$/i.test(p));
  const migrations = hashInventory(root, (p) => /^migrations\/.+/i.test(p));
  const tests = hashInventory(root, (p) => /(^|\/)(tests?|__tests__)\/.+\.(mjs|cjs|js|ts|tsx)$/i.test(p));
  const skills = hashInventory(root, (p) => /^\.agents\/skills\/[^/]+\/SKILL\.md$/i.test(p));

  return {
    contextSchemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: {
      name: readJson(path.join(root, "package.json")).name ?? null,
      version: readJson(path.join(root, "package.json")).version ?? null
    },
    authorities,
    workspace,
    roles,
    wrangler,
    migrations,
    tests,
    skills
  };
}

export function normalizedContext(context) {
  const copy = structuredClone(context);
  delete copy.generatedAt;
  delete copy.reviewReason;
  return copy;
}

export function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
