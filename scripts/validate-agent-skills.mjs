import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const skillsDir = path.join(root, ".agents", "skills");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(skillsDir)) {
  fail(`skills directory not found: ${skillsDir}`);
  process.exit();
}

const folders = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const names = new Set();
const volatileLimitPattern = /\b(10\s*ms|50\s*subrequests|3\s*MB bundle)\b/i;

for (const folder of folders) {
  const file = path.join(skillsDir, folder, "SKILL.md");
  if (!fs.existsSync(file)) {
    fail(`${folder}: SKILL.md is missing`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    fail(`${folder}: YAML frontmatter is missing`);
    continue;
  }
  const fm = frontmatter[1];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descriptionMatch = fm.match(/^description:\s*(.+)$/m);
  const licenseMatch = fm.match(/^license:\s*(.+)$/m);

  if (!nameMatch) fail(`${folder}: name is missing`);
  else {
    const name = nameMatch[1].trim().replace(/^['"]|['"]$/g, "");
    if (name !== folder) fail(`${folder}: frontmatter name must match folder, got ${name}`);
    if (names.has(name)) fail(`${folder}: duplicate skill name ${name}`);
    names.add(name);
  }
  if (!descriptionMatch || descriptionMatch[1].trim().length < 40) fail(`${folder}: description is missing or too short`);
  if (!licenseMatch || licenseMatch[1].trim() !== "MIT") fail(`${folder}: license must be MIT`);
  if (!/^#\s+.+/m.test(text)) fail(`${folder}: H1 heading is missing`);
  if (!text.includes("## 目的") && !text.includes("## 関連knowledge") && !text.includes("## 不変条件")) {
    fail(`${folder}: no purpose/knowledge/invariants section found`);
  }
  if (volatileLimitPattern.test(text)) fail(`${folder}: volatile Cloudflare numeric limit appears hard-coded`);
}

const requiredAdaptiveFiles = [
  "docs/agents/adaptation/source-registry.json",
  "docs/agents/adaptation/authority-registry.json",
  "docs/agents/adaptation/component-role-registry.json",
  "docs/agents/adaptation/cms-knowledge-registry.json",
  "scripts/agents/update-context-snapshot.mjs",
  "scripts/agents/check-context-drift.mjs"
];
for (const rel of requiredAdaptiveFiles) {
  if (!fs.existsSync(path.join(root, rel))) fail(`adaptive knowledge file missing: ${rel}`);
}

if (!process.exitCode) {
  console.log(`Validated ${folders.length} agent skills and adaptive knowledge files.`);
  console.log(folders.map((name) => `- ${name}`).join("\n"));
}
