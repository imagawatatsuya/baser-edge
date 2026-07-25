import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, basename } from "node:path";
import { createHash } from "node:crypto";

const textExtensions = new Set([".php",".css",".scss",".sass",".less",".js",".mjs",".cjs",".json",".xml",".txt",".md"]);
const assetExtensions = new Set([".png",".jpg",".jpeg",".gif",".webp",".svg",".ico",".woff",".woff2",".ttf",".otf"]);
const helperPatterns = [
  ["BcBaser", /\$this->BcBaser\b/g], ["BcContents", /\$this->BcContents\b/g], ["BcBlog", /\$this->BcBlog\b/g],
  ["BcMail", /\$this->BcMail\b/g], ["Html", /\$this->Html\b/g], ["Form", /\$this->Form\b/g],
  ["Configure", /Configure::(?:read|write)\b/g], ["Router", /Router::url\b/g],
];
const riskPatterns = [
  ["dynamic-include", /\b(?:include|require)(?:_once)?\s*\(/g, "high"],
  ["eval", /\beval\s*\(/g, "critical"],
  ["request-action", /\brequestAction\s*\(/g, "high"],
  ["shell-exec", /\b(?:exec|shell_exec|system|passthru)\s*\(/g, "critical"],
  ["database-query", /\b(?:find|query|execute)\s*\(/g, "high"],
];

export async function diagnoseBaserTheme(rootPath) {
  const root = resolve(rootPath);
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error("Theme diagnostic input must be an extracted directory");
  const files = await walk(root);
  const report = {
    formatVersion: 1,
    source: { path: root, name: basename(root), fileCount: files.length, fingerprint: "" },
    inventory: { phpTemplates: [], stylesheets: [], scripts: [], assets: [], configuration: [], other: [] },
    helpers: {},
    risks: [],
    templates: { layouts: [], pages: [], elements: [], emails: [], unknown: [] },
    migration: { compatibility: "high", automaticallyReusable: [], requiresAdapter: [], manualRewrite: [], blockers: [], suggestedDesignTokens: [], suggestedLayouts: [] },
  };
  const hasher = createHash("sha256");
  for (const absolute of files) {
    const path = relative(root, absolute).replaceAll("\\", "/");
    const extension = extname(path).toLowerCase();
    const fileInfo = await stat(absolute);
    hasher.update(path).update(String(fileInfo.size));
    if (extension === ".php") report.inventory.phpTemplates.push(path);
    else if ([".css",".scss",".sass",".less"].includes(extension)) report.inventory.stylesheets.push(path);
    else if ([".js",".mjs",".cjs"].includes(extension)) report.inventory.scripts.push(path);
    else if (assetExtensions.has(extension)) report.inventory.assets.push(path);
    else if ([".json",".xml"].includes(extension) || /config/i.test(path)) report.inventory.configuration.push(path);
    else report.inventory.other.push(path);

    classifyTemplate(path, report.templates);
    if (!textExtensions.has(extension) || fileInfo.size > 1024 * 1024) continue;
    const text = await readFile(absolute, "utf8");
    hasher.update(text);
    for (const [name, pattern] of helperPatterns) {
      const count = countMatches(text, pattern);
      if (count) report.helpers[name] = (report.helpers[name] ?? 0) + count;
    }
    for (const [kind, pattern, severity] of riskPatterns) {
      const count = countMatches(text, pattern);
      if (count) report.risks.push({ path, kind, severity, count });
    }
    if (extension === ".php") {
      const phpBlocks = countMatches(text, /<\?(?:php|=)/g);
      const controls = countMatches(text, /\b(?:if|foreach|for|while|switch)\s*\(/g);
      if (phpBlocks) report.migration.requiresAdapter.push({ path, reason: `${phpBlocks} PHP block(s)` });
      if (controls) report.migration.manualRewrite.push({ path, reason: `${controls} dynamic control structure(s)` });
    }
    if ([".css",".scss",".sass",".less"].includes(extension)) {
      report.migration.automaticallyReusable.push({ path, kind: "stylesheet" });
      for (const variable of extractCssVariables(text)) report.migration.suggestedDesignTokens.push({ path, ...variable });
      if (/@import\s+|url\s*\(\s*["']?https?:/i.test(text)) report.risks.push({ path, kind: "external-css-resource", severity: "medium", count: 1 });
    }
    if ([".js",".mjs",".cjs"].includes(extension)) {
      report.migration.manualRewrite.push({ path, reason: "JavaScript requires CSP and behavior review" });
      if (/document\.write|innerHTML\s*=|eval\s*\(/.test(text)) report.risks.push({ path, kind: "unsafe-dom-script", severity: "high", count: 1 });
    }
  }
  report.source.fingerprint = hasher.digest("hex");
  for (const path of report.inventory.assets) report.migration.automaticallyReusable.push({ path, kind: "asset" });
  report.migration.suggestedLayouts = inferLayouts(report.templates);
  const critical = report.risks.filter((risk) => risk.severity === "critical").length;
  const high = report.risks.filter((risk) => risk.severity === "high").length;
  if (critical) { report.migration.compatibility = "blocked"; report.migration.blockers.push("Critical executable PHP constructs require removal before migration"); }
  else if (high || report.migration.manualRewrite.length > 12) report.migration.compatibility = "low";
  else if (report.migration.requiresAdapter.length || report.migration.manualRewrite.length) report.migration.compatibility = "medium";
  return report;
}

export function formatThemeDiagnostic(report) {
  const lines = [
    `# baserCMSテーマ移行診断: ${report.source.name}`,
    "",
    `- 互換性評価: **${report.migration.compatibility}**`,
    `- ファイル数: ${report.source.fileCount}`,
    `- PHPテンプレート: ${report.inventory.phpTemplates.length}`,
    `- Stylesheet: ${report.inventory.stylesheets.length}`,
    `- JavaScript: ${report.inventory.scripts.length}`,
    `- Asset: ${report.inventory.assets.length}`,
    `- Fingerprint: \`${report.source.fingerprint}\``,
    "",
    "## baserCMS Helper利用",
    ...Object.entries(report.helpers).map(([name,count])=>`- ${name}: ${count}`),
    "",
    "## 手動対応が必要な項目",
    ...(report.migration.manualRewrite.length ? report.migration.manualRewrite.map((item)=>`- \`${item.path}\`: ${item.reason}`) : ["- なし"]),
    "",
    "## リスク",
    ...(report.risks.length ? report.risks.map((risk)=>`- **${risk.severity}** \`${risk.path}\`: ${risk.kind} (${risk.count})`) : ["- 検出なし"]),
    "",
    "## 推奨移行先",
    "- PHPテンプレートは実行せず、ThemeRelease用Renderer／Layoutへ変換する",
    "- CSSと画像は安全性検査後にThemeRelease Assetとして再利用する",
    "- BcBaser／BcContents呼び出しはサイトツリーQueryへ置換する",
    "- 動的フォームやブログ取得は各Kernelの型付きAPIへ置換する",
  ];
  return lines.join("\n");
}

async function walk(root) {
  const result=[];
  for (const entry of await readdir(root,{withFileTypes:true})) {
    if (["node_modules","vendor",".git","tmp","logs"].includes(entry.name)) continue;
    const path=resolve(root,entry.name);
    if(entry.isDirectory()) result.push(...await walk(path)); else if(entry.isFile()) result.push(path);
  }
  return result.sort();
}
function classifyTemplate(path, templates) {
  if (extname(path).toLowerCase() !== ".php") return;
  if (/(^|\/)Layout(s)?\//i.test(path)) templates.layouts.push(path);
  else if (/(^|\/)Pages?\//i.test(path)) templates.pages.push(path);
  else if (/(^|\/)Element(s)?\//i.test(path)) templates.elements.push(path);
  else if (/(^|\/)Email(s)?\//i.test(path)) templates.emails.push(path);
  else templates.unknown.push(path);
}
function inferLayouts(templates) {
  const values=[];
  for(const path of templates.layouts) values.push({source:path,layout:"site-shell",confidence:"high"});
  if(templates.layouts.length===0&&templates.pages.length) values.push({source:null,layout:"site-shell",confidence:"low"});
  return values;
}
function extractCssVariables(text) {
  const values=[];
  for(const match of text.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]{1,120})/g)) values.push({name:match[1],value:match[2].trim()});
  for(const match of text.matchAll(/(?:color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) values.push({name:"color-candidate",value:match[1]});
  return values.slice(0,100);
}
function countMatches(text, pattern) { pattern.lastIndex=0; return [...text.matchAll(pattern)].length; }
