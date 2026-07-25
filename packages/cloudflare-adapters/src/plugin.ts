import {
  asPluginActivationId,
  asPluginId,
  asPluginInvocationId,
  asPluginReleaseId,
  asPrincipalId,
  asSiteId,
  assertDomain,
  type PluginActivationId,
  type PluginId,
  type PluginReleaseId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import type {
  Plugin,
  PluginActivation,
  PluginInvocation,
  PluginRelease,
  PluginRuntime,
  PluginRuntimeInvocation,
  PluginRuntimeResult,
  PluginStore,
} from "@baser-edge/plugin-kernel";

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown[]>; }

export class D1PluginStore implements PluginStore {
  readonly #db: Database;
  constructor(db: Database) { this.#db = db; }
  async createPlugin(plugin: Plugin): Promise<void> {
    await this.#db.prepare("INSERT INTO plugins(id,workspace_id,plugin_key,name,description,trust,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(plugin.id,plugin.workspaceId,plugin.key,plugin.name,plugin.description,plugin.trust,plugin.state,plugin.createdBy,plugin.createdAt).run();
  }
  async getPlugin(id: PluginId): Promise<Plugin | null> { const row=await this.#db.prepare("SELECT * FROM plugins WHERE id=?").bind(id).first<PluginRow>();return row?mapPlugin(row):null; }
  async getPluginByKey(workspaceId: WorkspaceId, key: string): Promise<Plugin | null> { const row=await this.#db.prepare("SELECT * FROM plugins WHERE workspace_id=? AND plugin_key=?").bind(workspaceId,key).first<PluginRow>();return row?mapPlugin(row):null; }
  async listPlugins(workspaceId: WorkspaceId): Promise<Plugin[]> { return (await this.#db.prepare("SELECT * FROM plugins WHERE workspace_id=? ORDER BY created_at DESC").bind(workspaceId).all<PluginRow>()).results.map(mapPlugin); }
  async createRelease(release: PluginRelease): Promise<void> {
    await this.#db.prepare("INSERT INTO plugin_releases(id,plugin_id,version,manifest_json,bundle_json,release_hash,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(release.id,release.pluginId,release.version,JSON.stringify(release.manifest),JSON.stringify(release.bundle),release.releaseHash,release.state,release.createdBy,release.createdAt).run();
  }
  async getRelease(id: PluginReleaseId): Promise<PluginRelease | null> { const row=await this.#db.prepare("SELECT * FROM plugin_releases WHERE id=?").bind(id).first<ReleaseRow>();return row?mapRelease(row):null; }
  async listReleases(pluginId: PluginId): Promise<PluginRelease[]> { return (await this.#db.prepare("SELECT * FROM plugin_releases WHERE plugin_id=? ORDER BY created_at DESC").bind(pluginId).all<ReleaseRow>()).results.map(mapRelease); }
  async activate(activation: PluginActivation): Promise<void> {
    const release=await this.getRelease(activation.pluginReleaseId);assertDomain(release,"PLUGIN_RELEASE_NOT_FOUND","Plugin release not found",404);
    await this.#db.batch([
      this.#db.prepare("UPDATE plugin_activations SET state='disabled',deactivated_at=? WHERE workspace_id=? AND COALESCE(site_id,'')=COALESCE(?, '') AND plugin_id=? AND state='active'")
        .bind(activation.activatedAt,activation.workspaceId,activation.siteId,release.pluginId),
      this.#db.prepare("INSERT INTO plugin_activations(id,workspace_id,site_id,plugin_id,plugin_release_id,granted_capabilities_json,allowed_hosts_json,state,activated_by,activated_at,deactivated_at) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)")
        .bind(activation.id,activation.workspaceId,activation.siteId,release.pluginId,activation.pluginReleaseId,JSON.stringify(activation.grantedCapabilities),JSON.stringify(activation.allowedHosts),activation.state,activation.activatedBy,activation.activatedAt),
    ]);
  }
  async deactivate(activationId: PluginActivationId, at: number): Promise<void> { await this.#db.prepare("UPDATE plugin_activations SET state='disabled',deactivated_at=? WHERE id=? AND state='active'").bind(at,activationId).run(); }
  async getActivation(id: PluginActivationId): Promise<PluginActivation | null> { const row=await this.#db.prepare("SELECT * FROM plugin_activations WHERE id=?").bind(id).first<ActivationRow>();return row?mapActivation(row):null; }
  async listActiveActivations(workspaceId: WorkspaceId, siteId?: SiteId | null): Promise<PluginActivation[]> {
    const rows=siteId===undefined
      ? await this.#db.prepare("SELECT * FROM plugin_activations WHERE workspace_id=? AND state='active' ORDER BY activated_at").bind(workspaceId).all<ActivationRow>()
      : await this.#db.prepare("SELECT * FROM plugin_activations WHERE workspace_id=? AND state='active' AND (site_id IS NULL OR site_id=?) ORDER BY activated_at").bind(workspaceId,siteId).all<ActivationRow>();
    return rows.results.map(mapActivation);
  }
  async recordInvocation(invocation: PluginInvocation): Promise<void> {
    await this.#db.prepare("INSERT INTO plugin_invocations(id,plugin_release_id,activation_id,hook_name,route_id,request_id,state,duration_ms,error_code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(invocation.id,invocation.pluginReleaseId,invocation.activationId,invocation.hookName,invocation.routeId,invocation.requestId,invocation.state,invocation.durationMs,invocation.errorCode,invocation.createdAt).run();
  }
  async listInvocations(pluginReleaseId: PluginReleaseId): Promise<PluginInvocation[]> { return (await this.#db.prepare("SELECT * FROM plugin_invocations WHERE plugin_release_id=? ORDER BY created_at DESC").bind(pluginReleaseId).all<InvocationRow>()).results.map(mapInvocation); }
}

export interface DispatchWorkerLike { fetch(request: Request): Promise<Response>; }
export interface DispatchNamespaceLike {
  get(name: string, args?: Record<string, unknown>, options?: { limits?: { cpuMs?: number; subRequests?: number } }): DispatchWorkerLike;
}

export class WorkersForPlatformsPluginRuntime implements PluginRuntime {
  readonly #dispatcher: DispatchNamespaceLike;
  readonly #scriptPrefix: string;
  readonly #cpuMs: number;
  readonly #subRequests: number;
  readonly #networkPolicyEnforced: boolean;
  constructor(input: { dispatcher: DispatchNamespaceLike; scriptPrefix?: string; cpuMs?: number; subRequests?: number; networkPolicyEnforced?: boolean }) {
    this.#dispatcher=input.dispatcher;this.#scriptPrefix=input.scriptPrefix??"baser-plugin-";this.#cpuMs=input.cpuMs??20;this.#subRequests=input.subRequests??10;this.#networkPolicyEnforced=input.networkPolicyEnforced??false;
  }
  async invoke(release: PluginRelease, invocation: PluginRuntimeInvocation): Promise<PluginRuntimeResult> {
    assertDomain(release.bundle.format==="worker-module","SANDBOX_RUNTIME_BUNDLE_REQUIRED","Sandbox runtime requires a worker-module release",500);
    const requestsNetwork = invocation.context.capabilities.includes("network:request") || invocation.context.allowedHosts.length > 0;
    assertDomain(!requestsNetwork || this.#networkPolicyEnforced,"PLUGIN_OUTBOUND_POLICY_REQUIRED","Network-enabled sandbox plugins require an enforced outbound Worker policy",503);
    const worker=this.#dispatcher.get(`${this.#scriptPrefix}${release.id}`,{}, {limits:{cpuMs:this.#cpuMs,subRequests:this.#subRequests}});
    const response=await worker.fetch(new Request("https://plugin.internal/v1/invoke",{
      method:"POST",headers:{"content-type":"application/json","x-baser-plugin-protocol":"1"},body:JSON.stringify(invocation),
    }));
    const text=await readLimitedText(response,256*1024);
    if(!response.ok)return{ok:false,error:{code:`PLUGIN_SANDBOX_${response.status}`,message:text.slice(0,1000)||"Sandbox plugin failed"}};
    try { const parsed=JSON.parse(text) as PluginRuntimeResult; return parsed&&typeof parsed==="object"&&typeof parsed.ok==="boolean"?parsed:{ok:false,error:{code:"INVALID_PLUGIN_RESPONSE",message:"Sandbox returned an invalid response"}}; }
    catch{return{ok:false,error:{code:"INVALID_PLUGIN_RESPONSE",message:"Sandbox returned non-JSON output"}};}
  }
}

async function readLimitedText(response:Response,limit:number):Promise<string>{const buffer=await response.arrayBuffer();assertDomain(buffer.byteLength<=limit,"PLUGIN_RESPONSE_TOO_LARGE","Plugin response exceeds limit",502);return new TextDecoder().decode(buffer);}
type PluginRow={id:string;workspace_id:string;plugin_key:string;name:string;description:string;trust:Plugin["trust"];state:Plugin["state"];created_by:string;created_at:number};
type ReleaseRow={id:string;plugin_id:string;version:string;manifest_json:string;bundle_json:string;release_hash:string;state:PluginRelease["state"];created_by:string;created_at:number};
type ActivationRow={id:string;workspace_id:string;site_id:string|null;plugin_release_id:string;granted_capabilities_json:string;allowed_hosts_json:string;state:PluginActivation["state"];activated_by:string;activated_at:number;deactivated_at:number|null};
type InvocationRow={id:string;plugin_release_id:string;activation_id:string;hook_name:PluginInvocation["hookName"];route_id:string|null;request_id:string;state:PluginInvocation["state"];duration_ms:number;error_code:string|null;created_at:number};
function mapPlugin(r:PluginRow):Plugin{return{id:asPluginId(r.id),workspaceId:r.workspace_id as WorkspaceId,key:r.plugin_key,name:r.name,description:r.description,trust:r.trust,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapRelease(r:ReleaseRow):PluginRelease{return{id:asPluginReleaseId(r.id),pluginId:asPluginId(r.plugin_id),version:r.version,manifest:JSON.parse(r.manifest_json),bundle:JSON.parse(r.bundle_json),releaseHash:r.release_hash,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapActivation(r:ActivationRow):PluginActivation{return{id:asPluginActivationId(r.id),workspaceId:r.workspace_id as WorkspaceId,siteId:r.site_id?asSiteId(r.site_id):null,pluginReleaseId:asPluginReleaseId(r.plugin_release_id),grantedCapabilities:JSON.parse(r.granted_capabilities_json),allowedHosts:JSON.parse(r.allowed_hosts_json),state:r.state,activatedBy:asPrincipalId(r.activated_by),activatedAt:r.activated_at,deactivatedAt:r.deactivated_at};}
function mapInvocation(r:InvocationRow):PluginInvocation{return{id:asPluginInvocationId(r.id),pluginReleaseId:asPluginReleaseId(r.plugin_release_id),activationId:asPluginActivationId(r.activation_id),hookName:r.hook_name,routeId:r.route_id,requestId:r.request_id,state:r.state,durationMs:r.duration_ms,errorCode:r.error_code,createdAt:r.created_at};}
