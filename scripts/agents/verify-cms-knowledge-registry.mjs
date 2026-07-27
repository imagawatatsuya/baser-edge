import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceFile = path.join(root, "docs/agents/adaptation/source-registry.json");
const knowledgeFile = path.join(root, "docs/agents/adaptation/cms-knowledge-registry.json");
const rolesFile = path.join(root, "docs/agents/adaptation/component-role-registry.json");

function read(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let failed = false;
function error(message) {
  failed = true;
  console.error(`ERROR: ${message}`);
}

for (const file of [sourceFile, knowledgeFile, rolesFile]) {
  if (!fs.existsSync(file)) error(`missing registry: ${path.relative(root, file)}`);
}
if (failed) process.exit(1);

const sources = read(sourceFile);
const knowledge = read(knowledgeFile);
const roles = read(rolesFile);
const sourceIds = new Set(sources.sources.map((item) => item.id));
const roleIds = new Set(roles.roles.map((item) => item.id));
const decisions = new Set(knowledge.decisions);
const entryIds = new Set();

for (const entry of knowledge.entries) {
  if (!/^CMS-[A-Z]+-[0-9]{3}$/.test(entry.id)) error(`${entry.id}: invalid stable ID`);
  if (entryIds.has(entry.id)) error(`${entry.id}: duplicate ID`);
  entryIds.add(entry.id);
  if (!entry.title || !entry.universalNeed || !entry.rationale) error(`${entry.id}: required narrative field missing`);
  if (!decisions.has(entry.decision)) error(`${entry.id}: invalid decision ${entry.decision}`);
  if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length === 0) error(`${entry.id}: sourceRefs required`);
  for (const ref of entry.sourceRefs ?? []) if (!sourceIds.has(ref)) error(`${entry.id}: unknown sourceRef ${ref}`);
  if (!Array.isArray(entry.componentRoles) || entry.componentRoles.length === 0) error(`${entry.id}: componentRoles required`);
  for (const role of entry.componentRoles ?? []) if (!roleIds.has(role)) error(`${entry.id}: unknown component role ${role}`);
  if (!Array.isArray(entry.acceptance) || entry.acceptance.length === 0) error(`${entry.id}: acceptance required`);
  if (!Array.isArray(entry.revisitTriggers) || entry.revisitTriggers.length === 0) error(`${entry.id}: revisitTriggers required`);
}

if (!failed) {
  console.log(`Validated ${knowledge.entries.length} CMS knowledge entries, ${sourceIds.size} sources, and ${roleIds.size} component roles.`);
}
process.exitCode = failed ? 1 : 0;
