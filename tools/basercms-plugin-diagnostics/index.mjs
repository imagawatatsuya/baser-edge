import { readFile, readdir, stat } from "node:fs/promises";
import { relative, extname, basename } from "node:path";

const TEXT_EXTENSIONS = new Set([".php",".js",".ts",".json",".xml",".yml",".yaml",".css",".scss",".md",".txt"]);
const SKIP_DIRS = new Set(["vendor","node_modules",".git","tmp","logs","cache","dist","build"]);

export async function diagnoseBaserPlugin(root) {
  const files = await walk(root);
  const textFiles = [];
  for (const path of files) {
    if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const info = await stat(path);
    if (info.size > 2 * 1024 * 1024) continue;
    textFiles.push({ path, relativePath: relative(root,path).replaceAll("\\","/"), text: await readFile(path,"utf8") });
  }
  const php = textFiles.filter((file)=>extname(file.path).toLowerCase()===".php");
  const javascript = textFiles.filter((file)=>[".js",".ts"].includes(extname(file.path).toLowerCase()));
  const all = textFiles.map((file)=>file.text).join("\n");
  const fileKinds = classifyFiles(files, root);
  const findings = [];
  const addFrom = (candidates, severity, code, title, pattern, explanation, migration) => {
    const matches = candidates.filter((file)=>pattern.test(file.text)).map((file)=>file.relativePath).slice(0,20);
    if (matches.length) findings.push({severity,code,title,files:matches,explanation,migration});
  };
  const addPhp = (...args) => addFrom(php, ...args);
  const add = (...args) => addFrom(textFiles, ...args);
  addPhp("critical","dynamic-code","動的コード実行",/\b(eval|assert)\s*\(/i,"Cloudflareの隔離Pluginでも受理しない。コード生成または静的なHandlerへ置換する必要がある。","manual-rewrite");
  addPhp("critical","process-execution","OSプロセス実行",/\b(shell_exec|exec|system|passthru|proc_open|popen)\s*\(/i,"WorkersにはOSプロセスがなく、セキュリティ上も移植不可。","manual-rewrite");
  addPhp("high","filesystem-write","ファイルシステム書込み",/\b(file_put_contents|fwrite|mkdir|rename|unlink|copy|chmod)\s*\(/i,"R2 AssetまたはPlugin専用Storageへ置換する。パスをコンテンツ正本にしない。","storage-adapter");
  addPhp("high","direct-database","直接SQL・Connection操作",/\b(ConnectionManager|getConnection|execute\s*\(|query\s*\(|->execute\s*\(|->query\s*\()/i,"PluginからD1へ任意SQLを許可せず、宣言済みStorage CollectionまたはHost APIへ置換する。","storage-schema");
  addPhp("high","form-protection-disabled","FormProtection無効化",/FormProtection[^\n]{0,160}(setConfig\s*\(\s*["']validate["']\s*,\s*false|unloadComponent)/i,"CSRF等の保護を外す実装は移植しない。型付きRouteとHost認証へ置換する。","security-redesign");
  add("high","arbitrary-markup","任意HTMLまたはScript注入",/(base64_decode\s*\(|<script\b|innerHTML\s*=|htmlspecialchars_decode\s*\()/i,"任意HTMLを正本・実行コードとして扱わず、安全なBlockまたは隔離Rendererへ変換する。","renderer-redesign");
  {
    const networkFiles = [
      ...php.filter((file)=>/(?:\b(?:curl_|HttpClient|ClientInterface)\b|file_get_contents\s*\(\s*["']https?:\/\/)/i.test(file.text)),
      ...javascript.filter((file)=>/\bfetch\s*\(/i.test(file.text)),
    ].map((file)=>file.relativePath);
    const matches=[...new Set(networkFiles)].slice(0,20);
    if(matches.length)findings.push({severity:"medium",code:"network-access",title:"外部ネットワーク通信",files:matches,explanation:"network:request CapabilityとホストAllowlistをManifestへ宣言する。",migration:"capability-network"});
  }
  addPhp("medium","email-send","メール送信",/(?:\bmail\s*\(|\bsendMail\s*\(|(?:Mailer|Email)[^\n]{0,100}->send\s*\()/i,"email:send Capabilityと通知Outboxへ置換する。","capability-email");
  add("medium","session-state","Session依存",/\b(Session|sessionStorage|$_SESSION)\b/i,"Workersのローカルメモリへ依存せず、期限付きSession Storeへ置換する。","session-adapter");
  add("info","event-listener","CakePHP Event Listener",/(EventListenerInterface|implementedEvents\s*\(|ControllerEventListener|ViewEventListener)/i,"対応する宣言的Hookへ分解する候補。","hook-adapter");
  add("info","admin-controller","管理画面Controller",/(Admin\b|prefix\s*=>\s*["']Admin|admin\/)/i,"admin:pageまたはHost管理画面の専用モジュールへ変換する。","admin-extension");
  add("info","burger-addon","BurgerEditor Addon",/(BurgerAddon|data-bgb|data-bgt)/i,"Component Manifest・Block Version・Importerへ変換する。","block-manifest");

  const recommendedCapabilities = new Set();
  if (/(Table|Entity|Service|Repository|find\s*\()/i.test(all)) recommendedCapabilities.add("content:read");
  if (/(save\s*\(|patchEntity|newEntity|delete\s*\()/i.test(all)) recommendedCapabilities.add("content:propose");
  if (findings.some((f)=>f.code==="network-access")) recommendedCapabilities.add("network:request");
  if (findings.some((f)=>f.code==="email-send")) recommendedCapabilities.add("email:send");
  if (findings.some((f)=>f.code==="filesystem-write")) recommendedCapabilities.add("storage:write");
  if (fileKinds.controllers.admin > 0 || fileKinds.templates.admin > 0) recommendedCapabilities.add("admin:page");
  if (fileKinds.controllers.total > 0 || fileKinds.routes > 0) recommendedCapabilities.add("api:route");
  if (findings.some((f)=>f.code==="burger-addon")) recommendedCapabilities.add("block:register");

  const suggestedHooks = new Set();
  if (/beforeSave|beforeMarshal|Controller\.beforeRender/i.test(all)) suggestedHooks.add("content.beforePublish (要手動判定)");
  if (/afterSave|afterAdd|afterEdit/i.test(all)) suggestedHooks.add("content.afterPublish (要手動判定)");
  if (/(MailSubmission|afterSubmit|MailController)/i.test(all)) suggestedHooks.add("mail.afterSubmit");
  if (/(ThemeEventListener|afterThemeActivate|theme:afterActivate)/i.test(all)) suggestedHooks.add("theme.afterActivate");

  const critical = findings.filter((f)=>f.severity==="critical").length;
  const high = findings.filter((f)=>f.severity==="high").length;
  const trustRecommendation = critical > 0 ? "manual-rewrite" : high > 0 ? "trusted-adapter-required" : "sandbox-candidate";
  const identity = inferIdentity(root,textFiles);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    root,
    identity,
    summary: { totalFiles: files.length, phpFiles: php.length, ...fileKinds, criticalFindings:critical, highFindings:high, trustRecommendation },
    recommendedManifest: {
      key: identity.key,
      name: identity.name,
      trust: trustRecommendation === "sandbox-candidate" ? "sandboxed" : "trusted",
      capabilities:[...recommendedCapabilities].sort(),
      hooks:[...suggestedHooks].sort(),
      source:{kind:"basercms-migration",reference:identity.sourceReference},
    },
    findings,
    migrationPlan: buildPlan(findings,fileKinds),
  };
}

export function renderPluginDiagnosticMarkdown(report) {
  const lines=[`# baserCMS Plugin移行診断: ${report.identity.name}`,"",`- Key候補: \`${report.identity.key}\``,`- 判定: **${report.summary.trustRecommendation}**`,`- PHP: ${report.summary.phpFiles} files`,`- Critical: ${report.summary.criticalFindings}`,`- High: ${report.summary.highFindings}`,"","## 推奨Manifest","",'```json',JSON.stringify(report.recommendedManifest,null,2),'```',"","## 構成","",`- Controllers: ${report.controllers?.total ?? report.summary.controllers.total}`,`- Services: ${report.summary.services}`,`- Models: ${report.summary.models}`,`- Templates: ${report.summary.templates.total}`,`- Migrations: ${report.summary.migrations}`,"","## Findings",""];
  if(!report.findings.length) lines.push("移行阻害パターンは検出されませんでした。ただし動作保証ではありません。");
  for(const finding of report.findings){lines.push(`### [${finding.severity}] ${finding.title}`,"",finding.explanation,"",`移行方針: \`${finding.migration}\``,"",...finding.files.map((f)=>`- \`${f}\``),"");}
  lines.push("## 移行工程","",...report.migrationPlan.map((step,i)=>`${i+1}. ${step}`),"");
  return lines.join("\n");
}

async function walk(root){const out=[];async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith(".")&&entry.name!==".htaccess")continue;if(entry.isDirectory()&&SKIP_DIRS.has(entry.name))continue;const path=`${dir}/${entry.name}`;if(entry.isDirectory())await visit(path);else if(entry.isFile())out.push(path);}}await visit(root.replace(/\/$/,""));return out;}
function classifyFiles(files,root){const rel=files.map((p)=>relative(root,p).replaceAll("\\","/"));const count=(re)=>rel.filter((p)=>re.test(p)).length;return{controllers:{total:count(/(^|\/)Controller\//i),admin:count(/(^|\/)Controller\/Admin\//i)},templates:{total:count(/(^|\/)(templates|Template)\//i),admin:count(/(^|\/)(templates|Template)\/Admin\//i)},services:count(/(^|\/)Service\//i),models:count(/(^|\/)(Model|Table|Entity)\//i),migrations:count(/(^|\/)(Migrations?|config\/Migrations)\//i),routes:count(/routes?\.(php|json|yml)$/i),commands:count(/(^|\/)(Command|Shell)\//i),assets:count(/(^|\/)(webroot|assets)\//i)};}
function inferIdentity(root,textFiles){let name=basename(root);let key=name.replace(/Plugin$/i,"").replace(/([a-z])([A-Z])/g,"$1-$2").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase().replace(/^-|-$/g,"")||"migrated-plugin";let sourceReference=basename(root);const composer=textFiles.find((f)=>f.relativePath==="composer.json");if(composer){try{const json=JSON.parse(composer.text);if(typeof json.name==="string"){sourceReference=json.name;const part=json.name.split("/").pop();if(part)key=part.replace(/^bc-/i,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase();}if(typeof json.description==="string"&&json.description.trim())name=json.description.trim().slice(0,120);}catch{}}
return{name,key,sourceReference};}
function buildPlan(findings,kinds){const steps=["元Pluginの機能を、公開表示・管理画面・保存・外部通信・インストール処理へ分解する。","推奨Manifestを人間が確認し、必要最小限のCapabilityだけを採用する。"];if(findings.some((f)=>f.code==="direct-database"))steps.push("直接SQLとMigrationをHost管理の宣言的Storage Schemaへ変換する。");if(findings.some((f)=>f.code==="filesystem-write"))steps.push("ファイル操作をR2 AssetまたはPlugin専用Storageへ変換する。");if(kinds.controllers.total)steps.push("Controllerを型付きAPI RouteまたはHost Service Commandへ分解する。");if(kinds.templates.total)steps.push("PHP TemplateをTheme Componentまたは管理画面Extensionへ変換する。");if(findings.some((f)=>f.severity==="critical"))steps.push("危険コードを除去し、同等機能をHost APIで再実装するまで有効化しない。");steps.push("隔離実行候補はWorkers for Platformsで検証し、Trusted扱いは第一者コードに限定する。","実サイトのデータ移行・権限・監査・Rollbackを統合テストする。");return steps;}
