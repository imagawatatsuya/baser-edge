import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { MemoryThemeStore, ThemeService } from "@baser-edge/theme-kernel";
import { D1CmsStore, D1ThemeStore } from "@baser-edge/cloudflare-adapters";
import { PreviewService, MemoryPreviewStore } from "@baser-edge/preview-kernel";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { Capabilities } from "@baser-edge/authorization";

const TOKENS = {
  colorBackground: "#fffdf8", colorSurface: "#ffffff", colorText: "#202018", colorMuted: "#666655",
  colorAccent: "#8a3b12", colorBorder: "#ded8cc", fontFamily: 'system-ui,"Noto Sans JP",sans-serif',
  baseFontSize: 17, lineHeight: 1.8, contentMaxWidth: 980, spacingScale: 1, radius: 12,
};
const LAYOUT = { header: "brand", navigation: "none", footer: "simple", showSiteName: true, footerText: "移植テーマ", mainClass: "bc-page migrated-page" };
const security = (cms) => ({ authorize: cms.authorizeOperation.bind(cms), success: cms.recordSuccessfulOperation.bind(cms) });

async function createRelease(themes, owner, boot, version, cssText) {
  let theme = (await themes.store.listThemes(boot.workspaceId))[0];
  if (!theme) theme = await themes.createTheme(owner, { workspaceId: boot.workspaceId, key: "baser-migrated", name: "baser移植テーマ" });
  let token = [...themes.store.tokenRevisions?.values?.() ?? []][0];
  if (!token) token = await themes.createTokenRevision(owner, { themeId: theme.id, name: "基本トークン", tokens: TOKENS });
  let layout = [...themes.store.layoutRevisions?.values?.() ?? []][0];
  if (!layout) layout = await themes.createLayoutRevision(owner, { themeId: theme.id, name: "基本レイアウト", layout: LAYOUT });
  return themes.createRelease(owner, {
    themeId: theme.id, version, designTokenRevisionId: token.id, layoutRevisionId: layout.id,
    manifest: { rendererApiVersion: 1, variant: "light", supportedContentTypes: ["page","article","blog","custom-content","mail-form"], cssText, source: { kind: "basercms-migration", reference: "theme/Example" } },
  });
}

test("ThemeRelease is immutable by API shape and only a human can activate it", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({ workspaceName: "Theme", siteName: "Theme Site", hostname: "theme.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const store = new MemoryThemeStore();
  const themes = new ThemeService({ store, cms, security: security(cms) });
  const release = await createRelease(themes, owner, boot, "1.0.0", ".migrated-page{outline:2px solid var(--bc-accent)}");
  const active = await themes.activate(owner, { siteId: boot.siteId, themeReleaseId: release.id });
  assert.equal(active.release.id, release.id);
  assert.equal(active.tokenRevision.tokens.colorAccent, "#8a3b12");

  release.manifest.cssText = "tampered";
  assert.notEqual((await store.getRelease(release.id)).manifest.cssText, "tampered");

  const agent = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Theme Agent" });
  for (const capability of [Capabilities.ThemeRead, Capabilities.ThemeManage, Capabilities.ThemeActivate]) {
    await cms.grantCapability(owner, { principalId: agent.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
  }
  const delegation = await cms.createDelegation(owner, { humanPrincipalId: boot.ownerPrincipalId, agentPrincipalId: agent.id, capabilities: [Capabilities.ThemeRead,Capabilities.ThemeManage,Capabilities.ThemeActivate], scope: { workspaceId: boot.workspaceId, siteId: boot.siteId }, maximumRisk: "high", expiresAt: Date.now()+60_000 });
  const agentActor = actor(agent.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });
  await assert.rejects(themes.activate(agentActor, { siteId: boot.siteId, themeReleaseId: release.id }), (error) => error instanceof DomainError && error.code === "HUMAN_THEME_ACTIVATION_REQUIRED");

  const theme = await store.getTheme(release.themeId);
  await assert.rejects(themes.createRelease(owner, {
    themeId: theme.id, version: "1.0.1", designTokenRevisionId: active.tokenRevision.id, layoutRevisionId: active.layoutRevision.id,
    manifest: { rendererApiVersion:1,variant:"light",supportedContentTypes:["page"],cssText:'@import "https://evil.test/x.css";',source:{kind:"native"} },
  }), (error) => error instanceof DomainError && error.code === "UNSAFE_THEME_CSS");
});

test("published pages use the active release while preview remains pinned to its release", async () => {
  const cms = new CmsService(new MemoryCmsStore());
  const boot = await cms.bootstrap({ workspaceName: "Preview Theme", siteName: "公式サイト", hostname: "preview-theme.test", ownerName: "Owner" });
  const owner = actor(boot.ownerPrincipalId, "human");
  const themes = new ThemeService({ store: new MemoryThemeStore(), cms, security: security(cms) });
  const releaseA = await createRelease(themes, owner, boot, "1.0.0", ".migrated-page{border-top:7px solid #8a3b12}");
  const releaseB = await createRelease(themes, owner, boot, "1.1.0", ".migrated-page{border-top:11px solid #123456}");
  await themes.activate(owner, { siteId: boot.siteId, themeReleaseId: releaseA.id });

  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text: "Theme Preview" }));
  const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "theme-preview", title: "Theme Preview", document });
  const approval = await cms.requestApproval(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, approvalId: approval.id });

  const previews = new PreviewService({ store: new MemoryPreviewStore(), cms, security: security(cms), signingSecret: "theme-preview-secret-for-tests" });
  const preview = await previews.create(owner, { contentItemId: page.item.id, revisionId: page.workingRevision.id, previewBaseUrl: "https://theme.test", themeRelease: releaseA.id });
  await themes.activate(owner, { siteId: boot.siteId, themeReleaseId: releaseB.id });

  const worker = createPublicWorker(() => cms, { resolvePreview: () => previews, resolveThemes: () => themes });
  const publicResponse = await worker.fetch(new Request("https://theme.test/theme-preview"), { SITE_ID: boot.siteId });
  const publicHtml = await publicResponse.text();
  assert.equal(publicResponse.status, 200);
  assert.match(publicHtml, new RegExp(`data-theme-release="${releaseB.id}"`));
  assert.match(publicHtml, /border-top:11px solid #123456/);

  const previewResponse = await worker.fetch(new Request(preview.previewUrl), {});
  const previewHtml = await previewResponse.text();
  assert.equal(previewResponse.status, 200);
  assert.match(previewHtml, new RegExp(`data-theme-release="${releaseA.id}"`));
  assert.match(previewHtml, /border-top:7px solid #8a3b12/);
});

class Statement {
  constructor(db, sql, values=[]) { this.db=db;this.sql=sql;this.values=values; }
  bind(...values){return new Statement(this.db,this.sql,values);} async first(){return this.db.prepare(this.sql).get(...this.values)??null;} async all(){return{results:this.db.prepare(this.sql).all(...this.values)}} async run(){return this.db.prepare(this.sql).run(...this.values);}
}
class D1Shim { constructor(db){this.db=db;} prepare(sql){return new Statement(this.db,sql);} async batch(statements){this.db.exec("BEGIN");try{const out=[];for(const statement of statements)out.push(await statement.run());this.db.exec("COMMIT");return out;}catch(error){this.db.exec("ROLLBACK");throw error;}} }
function migrate(db){const dir=new URL("../migrations/",import.meta.url);for(const file of readdirSync(dir).filter((name)=>name.endsWith(".sql")).sort())db.exec(readFileSync(new URL(file,dir),"utf8"));}

test("D1 theme store preserves immutable releases and activation history", async () => {
  const db=new DatabaseSync(":memory:");migrate(db);const shim=new D1Shim(db);const cms=new CmsService(new D1CmsStore(shim));
  const boot=await cms.bootstrap({workspaceName:"D1 Theme",siteName:"D1 Site",hostname:"d1-theme.test",ownerName:"Owner"});const owner=actor(boot.ownerPrincipalId,"human");
  const themes=new ThemeService({store:new D1ThemeStore(shim),cms,security:security(cms)});
  const a=await createRelease(themes,owner,boot,"1.0.0",".a{color:#111}");
  const b=await createRelease(themes,owner,boot,"1.1.0",".b{color:#222}");
  await themes.activate(owner,{siteId:boot.siteId,themeReleaseId:a.id});await themes.activate(owner,{siteId:boot.siteId,themeReleaseId:b.id});
  assert.equal((await themes.resolveActive(boot.siteId)).release.id,b.id);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM site_theme_activations WHERE site_id=?").get(boot.siteId).count,2);
  assert.throws(()=>db.prepare("UPDATE theme_releases SET state='retired' WHERE id=?").run(a.id),/THEME_RELEASE_IMMUTABLE/);
  db.close();
});

test("Theme API creates immutable artifacts and activates a release for a site", async () => {
  const { createApiWorker } = await import("../apps/api-worker/dist/index.js");
  const localCms = new CmsService(new MemoryCmsStore());
  const themes = new ThemeService({ store: new MemoryThemeStore(), cms: localCms, security: security(localCms) });
  const worker = createApiWorker(() => localCms, { resolveThemes: () => themes });
  const bootstrap = await worker.fetch(new Request("https://api.test/v1/bootstrap", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceName:"Theme API",siteName:"Theme API Site",hostname:"theme-api.test",ownerName:"Owner"}) }), {});
  const boot = await bootstrap.json();
  const headers={"content-type":"application/json","x-baser-principal-id":boot.ownerPrincipalId,"x-baser-principal-type":"human"};
  const themeResponse=await worker.fetch(new Request("https://api.test/v1/themes",{method:"POST",headers,body:JSON.stringify({workspaceId:boot.workspaceId,key:"official",name:"公式テーマ"})}),{});assert.equal(themeResponse.status,201);const theme=await themeResponse.json();
  const tokenResponse=await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/token-revisions`,{method:"POST",headers,body:JSON.stringify({name:"基本",tokens:TOKENS})}),{});assert.equal(tokenResponse.status,201);const token=await tokenResponse.json();
  const layoutResponse=await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/layout-revisions`,{method:"POST",headers,body:JSON.stringify({name:"基本",layout:LAYOUT})}),{});assert.equal(layoutResponse.status,201);const layout=await layoutResponse.json();
  const releaseResponse=await worker.fetch(new Request(`https://api.test/v1/themes/${theme.id}/releases`,{method:"POST",headers,body:JSON.stringify({version:"1.0.0",designTokenRevisionId:token.id,layoutRevisionId:layout.id,manifest:{rendererApiVersion:1,variant:"light",supportedContentTypes:["*"],cssText:".official{display:block}",source:{kind:"native"}}})}),{});assert.equal(releaseResponse.status,201);const release=await releaseResponse.json();
  const activationResponse=await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/theme-activations`,{method:"POST",headers,body:JSON.stringify({themeReleaseId:release.id})}),{});assert.equal(activationResponse.status,201);
  const activeResponse=await worker.fetch(new Request(`https://api.test/v1/sites/${boot.siteId}/theme`,{headers}),{});assert.equal(activeResponse.status,200);assert.equal((await activeResponse.json()).release.id,release.id);
});
