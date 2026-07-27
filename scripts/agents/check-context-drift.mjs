import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildContext, normalizedContext, readJson } from "./lib/context.mjs";

const root = process.cwd();
const snapshotFile = path.join(root, ".agents/context/baseredge-context.snapshot.json");
const strictArg = process.argv.find((arg) => arg.startsWith("--strict="));
const strict = strictArg ? strictArg.split("=")[1] : "blocking";
const rank = { info: 1, review: 2, blocking: 3 };

if (!fs.existsSync(snapshotFile)) {
  console.error("BLOCKING: context snapshot is missing.");
  console.error('Run: node scripts/agents/update-context-snapshot.mjs --write --reason "initial installation"');
  process.exit(1);
}

const oldContext = readJson(snapshotFile);
const newContext = buildContext(root);
const issues = [];

function add(severity, area, message) {
  issues.push({ severity, area, message });
}

function mapBy(array, key = "path") {
  return new Map(array.map((item) => [item[key], item]));
}

const oldAuth = mapBy(oldContext.authorities.files);
const newAuth = mapBy(newContext.authorities.files);
for (const key of new Set([...oldAuth.keys(), ...newAuth.keys()])) {
  const before = oldAuth.get(key);
  const after = newAuth.get(key);
  const severity = after?.severity === "missing" ? "blocking" : (after?.severity ?? before?.severity ?? "review");
  if (!before) add(severity, "authority", `added: ${key}`);
  else if (!after) add(severity, "authority", `removed: ${key}`);
  else if (before.sha256 !== after.sha256 || before.exists !== after.exists) add(severity, "authority", `changed: ${key}`);
}

const oldFamilies = mapBy(oldContext.authorities.families, "id");
const newFamilies = mapBy(newContext.authorities.families, "id");
for (const [id, after] of newFamilies) {
  const before = oldFamilies.get(id);
  if (!before || JSON.stringify(before.active) !== JSON.stringify(after.active)) {
    add(after.severity ?? "blocking", "authority-family", `${id} active files changed: ${JSON.stringify(after.active)}`);
  } else if (JSON.stringify(before.all) !== JSON.stringify(after.all)) {
    add("review", "authority-family", `${id} version candidates changed: ${JSON.stringify(after.all)}`);
  }
}

const oldRoles = mapBy(oldContext.roles, "id");
const newRoles = mapBy(newContext.roles, "id");
for (const [id, after] of newRoles) {
  const before = oldRoles.get(id);
  if (after.required && !after.resolved) add("blocking", "component-role", `${id} is required but unresolved`);
  if (!before || JSON.stringify(before.matches) !== JSON.stringify(after.matches)) {
    add(after.required ? "blocking" : "review", "component-role", `${id} mapping changed: ${JSON.stringify(after.matches)}`);
  }
}

if (JSON.stringify(oldContext.workspace.workspacePatterns) !== JSON.stringify(newContext.workspace.workspacePatterns)) {
  add("blocking", "workspace", "root workspace patterns changed");
}
if (JSON.stringify(oldContext.workspace.workspaces) !== JSON.stringify(newContext.workspace.workspaces)) {
  add("review", "workspace", "workspace package inventory changed");
}
if (JSON.stringify(oldContext.workspace.rootScripts) !== JSON.stringify(newContext.workspace.rootScripts)) {
  add("review", "commands", "root package scripts changed");
}
if (JSON.stringify(oldContext.wrangler) !== JSON.stringify(newContext.wrangler)) {
  add("review", "wrangler", "Wrangler configuration inventory changed");
}
if (JSON.stringify(oldContext.migrations) !== JSON.stringify(newContext.migrations)) {
  add("info", "migrations", "migration inventory changed");
}
if (JSON.stringify(oldContext.tests) !== JSON.stringify(newContext.tests)) {
  add("info", "tests", "test inventory changed");
}
if (JSON.stringify(oldContext.skills) !== JSON.stringify(newContext.skills)) {
  add("review", "skills", "skill inventory changed");
}

if (issues.length === 0) {
  console.log("No baserEdge context drift detected.");
  process.exit(0);
}

issues.sort((a, b) => rank[b.severity] - rank[a.severity] || a.area.localeCompare(b.area));
for (const issue of issues) {
  console.log(`${issue.severity.toUpperCase()} [${issue.area}] ${issue.message}`);
}
console.log("\nReview the drift, update registries/skills only when semantics changed, then regenerate the snapshot with --write --reason.");

const threshold = rank[strict] ?? rank.blocking;
if (issues.some((issue) => rank[issue.severity] >= threshold)) {
  process.exitCode = 1;
}
