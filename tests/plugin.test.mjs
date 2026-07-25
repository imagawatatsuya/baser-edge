import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import {
  MemoryPluginStore, MemoryTrustedPluginRuntime, MemorySandboxPluginRuntime, PluginService,
  PluginCapabilities, PluginHooks, UnavailablePluginRuntime,
} from "@baser-edge/plugin-kernel";
import { D1CmsStore, D1PluginStore, WorkersForPlatformsPluginRuntime } from "@baser-edge/cloudflare-adapters";

const security=(cms)=>({authorize:cms.authorizeOperation.bind(cms),success:cms.recordSuccessfulOperation.bind(cms)});
const DIGEST="a".repeat(64);
function manifest(key,overrides={}){return{
  manifestVersion:1,key,name:key,description:"test plugin",capabilities:[PluginCapabilities.ContentRead],
  hooks:[],routes:[],admin:{pages:[],widgets:[]},network:{allowedHosts:[]},storage:{kvNamespaces:[],collections:[]},source:{kind:"native"},...overrides,
};}
async function setup({d1=false}={}){
  let db=null, store;
  if(d1){db=new DatabaseSync(":memory:");migrate(db);store=new D1CmsStore(new D1Shim(db));}else store=new MemoryCmsStore();
  const cms=new CmsService(store);const boot=await cms.bootstrap({workspaceName:"Plugin",siteName:"Site",hostname:"plugin.test",ownerName:"Owner"});const owner=actor(boot.ownerPrincipalId,"human");
  const runtime=new MemoryTrustedPluginRuntime();const sandbox=new MemorySandboxPluginRuntime();const pluginStore=d1?new D1PluginStore(new D1Shim(db)):new MemoryPluginStore();
  const plugins=new PluginService({store:pluginStore,cms,security:security(cms),trustedRuntime:runtime,sandboxRuntime:sandbox});cms.attachLifecycleHooks(plugins);
  return{db,cms,boot,owner,runtime,sandbox,plugins,pluginStore};
}
async function makeRelease(f,key="policy",overrides={}){
  const plugin=await f.plugins.createPlugin(f.owner,{workspaceId:f.boot.workspaceId,key,name:key,trust:overrides.trust??"trusted"});
  const release=await f.plugins.createRelease(f.owner,{pluginId:plugin.id,version:overrides.version??"1.0.0",manifest:manifest(key,overrides.manifest??{}),bundle:{format:overrides.trust==="sandboxed"?"worker-module":"host-module",entrypoint:overrides.trust==="sandboxed"?"worker:plugin":"builtin:plugin",sizeBytes:1200,sha256:DIGEST}});
  return{plugin,release};
}
async function pageReady(f,slug="page"){
  const document=createEmptyDocument();document.root.slots.body.push(createBlock("heading",{level:1,text:"Plugin test"}));
  const page=await f.cms.createPage(f.owner,{siteId:f.boot.siteId,parentId:null,slug,title:"Plugin test",document});
  const approval=await f.cms.requestApproval(f.owner,{contentItemId:page.item.id,revisionId:page.workingRevision.id});await f.cms.decideApproval(f.owner,{approvalId:approval.id,decision:"approved"});return{page,approval};
}

test("a declared beforePublish hook can block publication and is audited as an invocation",async()=>{
  const f=await setup();const {release}=await makeRelease(f,"policy",{manifest:{hooks:[{name:PluginHooks.ContentBeforePublish,handler:"check",failureMode:"block"}]}});
  f.runtime.register(release.id,"check",()=>({ok:true,output:{blocked:true,reason:"Editorial policy failed"}}));
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  const {page,approval}=await pageReady(f);
  await assert.rejects(f.cms.publish(f.owner,{contentItemId:page.item.id,revisionId:page.workingRevision.id,approvalId:approval.id}),(e)=>e instanceof DomainError&&e.code==="PLUGIN_POLICY_BLOCKED");
  assert.equal((await f.cms.getContent(f.owner,page.item.id)).item.publishedRevisionId,null);
  const invocations=await f.plugins.listInvocations(f.owner,release.id);assert.equal(invocations.length,1);assert.equal(invocations[0].state,"blocked");
});

test("afterPublish failures do not roll back committed content when failureMode is continue",async()=>{
  const f=await setup();const {release}=await makeRelease(f,"notify",{manifest:{hooks:[{name:PluginHooks.ContentAfterPublish,handler:"notify",failureMode:"continue"}]}});
  f.runtime.register(release.id,"notify",()=>({ok:false,error:{code:"MAIL_DOWN",message:"temporary"}}));
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  const {page,approval}=await pageReady(f,"published");const published=await f.cms.publish(f.owner,{contentItemId:page.item.id,revisionId:page.workingRevision.id,approvalId:approval.id});
  assert.equal(published.item.publishedRevisionId,page.workingRevision.id);assert.equal((await f.pluginStore.listInvocations(release.id))[0].state,"failed");
});

test("post-publish blocked output is recorded but cannot roll back or report a blocking failure",async()=>{
  const f=await setup();const {release}=await makeRelease(f,"late-policy",{manifest:{hooks:[{name:PluginHooks.ContentAfterPublish,handler:"late",failureMode:"continue"}]}});
  f.runtime.register(release.id,"late",()=>({ok:true,output:{blocked:true,reason:"too late"}}));
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  const {page,approval}=await pageReady(f,"late-published");const published=await f.cms.publish(f.owner,{contentItemId:page.item.id,revisionId:page.workingRevision.id,approvalId:approval.id});
  assert.equal(published.item.publishedRevisionId,page.workingRevision.id);assert.equal((await f.pluginStore.listInvocations(release.id))[0].state,"blocked");
});

test("content hooks do not run unless content:read was explicitly granted",async()=>{
  const f=await setup();const {release}=await makeRelease(f,"ungranted-hook",{manifest:{hooks:[{name:PluginHooks.ContentBeforePublish,handler:"check",failureMode:"block"}]}});
  let called=0;f.runtime.register(release.id,"check",()=>{called++;return{ok:true,output:{blocked:true}}});
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[]});
  const {page,approval}=await pageReady(f,"ungranted");await f.cms.publish(f.owner,{contentItemId:page.item.id,revisionId:page.workingRevision.id,approvalId:approval.id});
  assert.equal(called,0);
});

test("site-scoped activation overrides a workspace activation for the same plugin",async()=>{
  const f=await setup();const first=await makeRelease(f,"scope-policy");const second=await f.plugins.createRelease(f.owner,{pluginId:first.plugin.id,version:"2.0.0",manifest:manifest("scope-policy"),bundle:{format:"host-module",entrypoint:"builtin:v2",sizeBytes:100,sha256:"b".repeat(64)}});
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,pluginReleaseId:first.release.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:second.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  const active=await f.plugins.listActivations(f.owner,f.boot.workspaceId,f.boot.siteId);assert.equal(active.length,1);assert.equal(active[0].release.id,second.id);
  const all=await f.plugins.listActivations(f.owner,f.boot.workspaceId);assert.equal(all.length,2);
});

test("capability consent gates admin extensions and plugin routes",async()=>{
  const f=await setup();const capabilities=[PluginCapabilities.ApiRoute,PluginCapabilities.AdminPage,PluginCapabilities.AdminWidget];
  const {release}=await makeRelease(f,"ops",{manifest:{capabilities,hooks:[],routes:[{id:"status",method:"GET",path:"/status",handler:"status"}],admin:{pages:[{id:"settings",title:"設定",path:"/plugins/ops/settings"}],widgets:[{id:"health",title:"稼働状況",placement:"dashboard"}]}}});
  f.runtime.register(release.id,"status",(inv)=>({ok:true,response:{status:200,headers:{"content-type":"application/json","set-cookie":"forbidden=1"},body:JSON.stringify({ok:true,authorization:inv.route.headers.authorization??null})}}));
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[PluginCapabilities.ApiRoute]});
  assert.deepEqual(await f.plugins.listAdminExtensions(f.owner,f.boot.workspaceId,f.boot.siteId),[]);
  const result=await f.plugins.invokeRoute(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginKey:"ops",method:"GET",path:"/status",headers:{authorization:"secret",accept:"application/json"}});
  assert.equal(result.status,200);assert.equal(result.headers["set-cookie"],undefined);assert.equal(JSON.parse(result.body).authorization,null);
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:release.id,grantedCapabilities:capabilities});
  const extensions=await f.plugins.listAdminExtensions(f.owner,f.boot.workspaceId,f.boot.siteId);assert.equal(extensions[0].pages.length,1);assert.equal(extensions[0].widgets.length,1);
});

test("agents cannot create or activate plugin releases",async()=>{
  const f=await setup();const agent=await f.cms.createPrincipal(f.owner,{workspaceId:f.boot.workspaceId,type:"agent",displayName:"Agent"});
  for(const cap of ["plugin.manage","plugin.activate"]){await f.cms.grantCapability(f.owner,{principalId:agent.id,capability:cap,scope:{workspaceId:f.boot.workspaceId}});}
  const delegation=await f.cms.createDelegation(f.owner,{humanPrincipalId:f.boot.ownerPrincipalId,agentPrincipalId:agent.id,capabilities:["plugin.manage","plugin.activate"],scope:{workspaceId:f.boot.workspaceId},maximumRisk:"critical",expiresAt:Date.now()+60_000});
  const a=actor(agent.id,"agent",{onBehalfOf:f.boot.ownerPrincipalId,delegationId:delegation.id});
  await assert.rejects(f.plugins.createPlugin(a,{workspaceId:f.boot.workspaceId,key:"agent-made",name:"Agent",trust:"sandboxed"}),(e)=>e instanceof DomainError&&e.code==="HUMAN_PLUGIN_CREATION_REQUIRED");
});

test("Workers for Platforms adapter applies host-controlled limits and protocol",async()=>{
  let observed;
  const dispatcher={get(name,args,options){observed={name,args,options};return{async fetch(request){observed.body=await request.json();return new Response(JSON.stringify({ok:true,output:{accepted:true}}),{headers:{"content-type":"application/json"}});}}}};
  const runtime=new WorkersForPlatformsPluginRuntime({dispatcher,cpuMs:15,subRequests:4,networkPolicyEnforced:true});
  const f=await setup();const {release}=await makeRelease(f,"sandbox",{trust:"sandboxed",manifest:{capabilities:[PluginCapabilities.NetworkRequest],network:{allowedHosts:["api.example.com"]}}});
  const result=await runtime.invoke(release,{kind:"hook",hookName:PluginHooks.ContentAfterPublish,handler:"run",event:{x:1},context:{requestId:"r1",workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,capabilities:[PluginCapabilities.NetworkRequest],allowedHosts:["api.example.com"]}});
  assert.equal(result.ok,true);assert.equal(observed.name,`baser-plugin-${release.id}`);assert.deepEqual(observed.options.limits,{cpuMs:15,subRequests:4});assert.deepEqual(observed.body.context.allowedHosts,["api.example.com"]);
});

class Statement{constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;}bind(...v){return new Statement(this.db,this.sql,v);}async first(){return this.db.prepare(this.sql).get(...this.values)??null;}async all(){return{results:this.db.prepare(this.sql).all(...this.values)}}async run(){return this.db.prepare(this.sql).run(...this.values);}}
class D1Shim{constructor(db){this.db=db;}prepare(sql){return new Statement(this.db,sql);}async batch(stmts){this.db.exec("BEGIN");try{const out=[];for(const s of stmts)out.push(await s.run());this.db.exec("COMMIT");return out;}catch(e){this.db.exec("ROLLBACK");throw e;}}}
function migrate(db){const dir=new URL("../migrations/",import.meta.url);for(const file of readdirSync(dir).filter((n)=>n.endsWith(".sql")).sort())db.exec(readFileSync(new URL(file,dir),"utf8"));}



test("network-enabled sandbox plugins fail closed without an outbound policy",async()=>{
  const dispatcher={get(){return{async fetch(){return new Response(JSON.stringify({ok:true}));}}}};
  const runtime=new WorkersForPlatformsPluginRuntime({dispatcher});
  const f=await setup();const {release}=await makeRelease(f,"network-policy",{trust:"sandboxed",manifest:{capabilities:[PluginCapabilities.NetworkRequest],network:{allowedHosts:["api.example.com"]}}});
  await assert.rejects(runtime.invoke(release,{kind:"hook",hookName:PluginHooks.ContentAfterPublish,handler:"run",event:{},context:{requestId:"r2",workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,capabilities:[PluginCapabilities.NetworkRequest],allowedHosts:["api.example.com"]}}),(e)=>e instanceof DomainError&&e.code==="PLUGIN_OUTBOUND_POLICY_REQUIRED");
});

test("post-commit hooks cannot declare blocking failure mode",async()=>{
  const f=await setup();const plugin=await f.plugins.createPlugin(f.owner,{workspaceId:f.boot.workspaceId,key:"invalid-after",name:"Invalid",trust:"trusted"});
  await assert.rejects(f.plugins.createRelease(f.owner,{pluginId:plugin.id,version:"1.0.0",manifest:manifest("invalid-after",{hooks:[{name:PluginHooks.ContentAfterPublish,handler:"run",failureMode:"block"}]}),bundle:{format:"host-module",entrypoint:"builtin:invalid",sizeBytes:100,sha256:DIGEST}}),(e)=>e instanceof DomainError&&e.code==="PLUGIN_AFTER_HOOK_CANNOT_BLOCK");
});

test("D1 plugin store enforces immutable releases and scoped activation replacement",async()=>{
  const f=await setup({d1:true});const a=await makeRelease(f,"d1-plugin");const b=await f.plugins.createRelease(f.owner,{pluginId:a.plugin.id,version:"1.1.0",manifest:manifest("d1-plugin"),bundle:{format:"host-module",entrypoint:"builtin:v2",sizeBytes:100,sha256:"b".repeat(64)}});
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:a.release.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  await f.plugins.activate(f.owner,{workspaceId:f.boot.workspaceId,siteId:f.boot.siteId,pluginReleaseId:b.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
  const active=await f.pluginStore.listActiveActivations(f.boot.workspaceId,f.boot.siteId);assert.equal(active.length,1);assert.equal(active[0].pluginReleaseId,b.id);
  assert.throws(()=>f.db.prepare("UPDATE plugin_releases SET state='retired' WHERE id=?").run(a.release.id),/PLUGIN_RELEASE_IMMUTABLE/);f.db.close();
});

test("Plugin API creates, releases, activates, and lists extensions",async()=>{
  const {createApiWorker}=await import("../apps/api-worker/dist/index.js");const cms=new CmsService(new MemoryCmsStore());const runtime=new MemoryTrustedPluginRuntime();const store=new MemoryPluginStore();const plugins=new PluginService({store,cms,security:security(cms),trustedRuntime:runtime,sandboxRuntime:new UnavailablePluginRuntime()});
  const worker=createApiWorker(()=>cms,{resolvePlugins:()=>plugins});const bootResponse=await worker.fetch(new Request("https://api.test/v1/bootstrap",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceName:"API",siteName:"Site",hostname:"api-plugin.test",ownerName:"Owner"})}),{});const boot=await bootResponse.json();const headers={"content-type":"application/json","x-baser-principal-id":boot.ownerPrincipalId,"x-baser-principal-type":"human"};
  const p=await worker.fetch(new Request("https://api.test/v1/plugins",{method:"POST",headers,body:JSON.stringify({workspaceId:boot.workspaceId,key:"api-plugin",name:"API Plugin",trust:"trusted"})}),{});assert.equal(p.status,201);const plugin=await p.json();
  const m=manifest("api-plugin",{capabilities:[PluginCapabilities.AdminWidget],admin:{pages:[],widgets:[{id:"status",title:"Status",placement:"dashboard"}]}});const r=await worker.fetch(new Request(`https://api.test/v1/plugins/${plugin.id}/releases`,{method:"POST",headers,body:JSON.stringify({version:"1.0.0",manifest:m,bundle:{format:"host-module",entrypoint:"builtin:api",sizeBytes:10,sha256:DIGEST}})}),{});assert.equal(r.status,201);const release=await r.json();
  const a=await worker.fetch(new Request(`https://api.test/v1/workspaces/${boot.workspaceId}/plugin-activations`,{method:"POST",headers,body:JSON.stringify({siteId:boot.siteId,pluginReleaseId:release.id,grantedCapabilities:[PluginCapabilities.AdminWidget]})}),{});assert.equal(a.status,201);
  const e=await worker.fetch(new Request(`https://api.test/v1/workspaces/${boot.workspaceId}/plugin-admin-extensions?siteId=${boot.siteId}`,{headers}),{});assert.equal(e.status,200);assert.equal((await e.json())[0].widgets[0].id,"status");
  const i=await worker.fetch(new Request(`https://api.test/v1/plugin-releases/${release.id}/invocations`,{headers}),{});assert.equal(i.status,200);assert.deepEqual(await i.json(),[]);
});
