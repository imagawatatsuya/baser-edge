import {
  assertDomain,
  DomainError,
  asPluginActivationId,
  asPluginId,
  asPluginInvocationId,
  asPluginReleaseId,
  newId,
  sha256,
  stableStringify,
  systemClock,
  type ActorContext,
  type Clock,
  type ContentItemId,
  type PluginActivationId,
  type PluginId,
  type PluginInvocationId,
  type PluginReleaseId,
  type PrincipalId,
  type RevisionId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { Capabilities, type AuthorizationResource } from "@baser-edge/authorization";
import type { CmsLifecycleHooks, CmsLifecyclePublishEvent, CmsService } from "@baser-edge/content-kernel";

export type PluginTrust = "trusted" | "sandboxed";
export type PluginState = "active" | "disabled";
export type PluginReleaseState = "ready" | "retired";
export type PluginActivationState = "active" | "disabled";
export type PluginSourceKind = "native" | "basercms-migration" | "emdash-derived";

export const PluginCapabilities = {
  ContentRead: "content:read",
  ContentPropose: "content:propose",
  ContentRequestPublish: "content:request-publish",
  AssetRead: "asset:read",
  AssetWrite: "asset:write",
  MailSend: "email:send",
  NetworkRequest: "network:request",
  StorageRead: "storage:read",
  StorageWrite: "storage:write",
  AdminPage: "admin:page",
  AdminWidget: "admin:widget",
  ApiRoute: "api:route",
  BlockRegister: "block:register",
  AuditWrite: "audit:write",
} as const;
export type PluginCapability = (typeof PluginCapabilities)[keyof typeof PluginCapabilities];
const PLUGIN_CAPABILITY_SET = new Set<string>(Object.values(PluginCapabilities));

export const PluginHooks = {
  ContentBeforePublish: "content.beforePublish",
  ContentAfterPublish: "content.afterPublish",
  MailAfterSubmit: "mail.afterSubmit",
  ThemeAfterActivate: "theme.afterActivate",
} as const;
export type PluginHookName = (typeof PluginHooks)[keyof typeof PluginHooks];
const PLUGIN_HOOK_SET = new Set<string>(Object.values(PluginHooks));

export interface PluginHookManifest {
  name: PluginHookName;
  handler: string;
  failureMode: "continue" | "block";
}

export interface PluginRouteManifest {
  id: string;
  method: "GET" | "POST";
  path: string;
  handler: string;
}

export interface PluginAdminPageManifest {
  id: string;
  title: string;
  path: string;
}

export interface PluginAdminWidgetManifest {
  id: string;
  title: string;
  placement: "dashboard" | "content-sidebar";
}

export interface PluginStorageManifest {
  kvNamespaces: string[];
  collections: Array<{ key: string; maxBytes: number }>;
}

export interface PluginManifest {
  manifestVersion: 1;
  key: string;
  name: string;
  description: string;
  capabilities: PluginCapability[];
  hooks: PluginHookManifest[];
  routes: PluginRouteManifest[];
  admin: {
    pages: PluginAdminPageManifest[];
    widgets: PluginAdminWidgetManifest[];
  };
  network: { allowedHosts: string[] };
  storage: PluginStorageManifest;
  source: { kind: PluginSourceKind; reference?: string };
}

export interface Plugin {
  id: PluginId;
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  description: string;
  trust: PluginTrust;
  state: PluginState;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface PluginBundleDescriptor {
  format: "host-module" | "worker-module";
  entrypoint: string;
  sizeBytes: number;
  sha256: string;
}

export interface PluginRelease {
  id: PluginReleaseId;
  pluginId: PluginId;
  version: string;
  manifest: PluginManifest;
  bundle: PluginBundleDescriptor;
  releaseHash: string;
  state: PluginReleaseState;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface PluginActivation {
  id: PluginActivationId;
  workspaceId: WorkspaceId;
  siteId: SiteId | null;
  pluginReleaseId: PluginReleaseId;
  grantedCapabilities: PluginCapability[];
  allowedHosts: string[];
  state: PluginActivationState;
  activatedBy: PrincipalId;
  activatedAt: number;
  deactivatedAt: number | null;
}

export interface PluginInvocation {
  id: PluginInvocationId;
  pluginReleaseId: PluginReleaseId;
  activationId: PluginActivationId;
  hookName: PluginHookName | null;
  routeId: string | null;
  requestId: string;
  state: "succeeded" | "failed" | "blocked";
  durationMs: number;
  errorCode: string | null;
  createdAt: number;
}

export interface PluginStore {
  createPlugin(plugin: Plugin): Promise<void>;
  getPlugin(id: PluginId): Promise<Plugin | null>;
  getPluginByKey(workspaceId: WorkspaceId, key: string): Promise<Plugin | null>;
  listPlugins(workspaceId: WorkspaceId): Promise<Plugin[]>;
  createRelease(release: PluginRelease): Promise<void>;
  getRelease(id: PluginReleaseId): Promise<PluginRelease | null>;
  listReleases(pluginId: PluginId): Promise<PluginRelease[]>;
  activate(activation: PluginActivation): Promise<void>;
  deactivate(activationId: PluginActivationId, at: number): Promise<void>;
  getActivation(id: PluginActivationId): Promise<PluginActivation | null>;
  listActiveActivations(workspaceId: WorkspaceId, siteId?: SiteId | null): Promise<PluginActivation[]>;
  recordInvocation(invocation: PluginInvocation): Promise<void>;
  listInvocations(pluginReleaseId: PluginReleaseId): Promise<PluginInvocation[]>;
}

export interface PluginSecurityGateway {
  authorize(actor: ActorContext, capability: string, resource: AuthorizationResource, action: string, resourceType: string, resourceId: string): Promise<void>;
  success(actor: ActorContext, input: {
    workspaceId: WorkspaceId;
    siteId?: SiteId | null;
    action: string;
    resourceType: string;
    resourceId: string;
    capability: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export interface PluginRuntimeInvocation {
  kind: "hook" | "route";
  hookName?: PluginHookName;
  handler: string;
  event?: Record<string, unknown>;
  route?: {
    method: "GET" | "POST";
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
  };
  context: {
    requestId: string;
    workspaceId: WorkspaceId;
    siteId: SiteId | null;
    capabilities: PluginCapability[];
    allowedHosts: string[];
  };
}

export interface PluginRuntimeResult {
  ok: boolean;
  output?: Record<string, unknown>;
  response?: { status: number; headers?: Record<string, string>; body?: string };
  error?: { code: string; message: string };
}

export interface PluginRuntime {
  invoke(release: PluginRelease, invocation: PluginRuntimeInvocation): Promise<PluginRuntimeResult>;
}

export type TrustedPluginHandler = (invocation: PluginRuntimeInvocation) => Promise<PluginRuntimeResult> | PluginRuntimeResult;

export class UnavailablePluginRuntime implements PluginRuntime {
  readonly #reason: string;
  constructor(reason = "Plugin runtime is not configured") { this.#reason = reason; }
  async invoke(): Promise<PluginRuntimeResult> { return { ok: false, error: { code: "PLUGIN_RUNTIME_UNAVAILABLE", message: this.#reason } }; }
}

export class MemorySandboxPluginRuntime implements PluginRuntime {
  readonly #handlers = new Map<string, TrustedPluginHandler>();
  register(releaseId: PluginReleaseId, handlerName: string, handler: TrustedPluginHandler): void { this.#handlers.set(`${releaseId}:${handlerName}`, handler); }
  async invoke(release: PluginRelease, invocation: PluginRuntimeInvocation): Promise<PluginRuntimeResult> {
    assertDomain(release.bundle.format === "worker-module", "SANDBOX_RUNTIME_BUNDLE_REQUIRED", "Sandbox runtime only accepts worker-module releases", 500);
    const handler = this.#handlers.get(`${release.id}:${invocation.handler}`);
    assertDomain(handler, "PLUGIN_HANDLER_NOT_REGISTERED", `Plugin handler is not registered: ${invocation.handler}`, 500);
    return structuredClone(await handler(structuredClone(invocation)));
  }
}

export class MemoryTrustedPluginRuntime implements PluginRuntime {
  readonly #handlers = new Map<string, TrustedPluginHandler>();
  register(releaseId: PluginReleaseId, handlerName: string, handler: TrustedPluginHandler): void {
    this.#handlers.set(`${releaseId}:${handlerName}`, handler);
  }
  async invoke(release: PluginRelease, invocation: PluginRuntimeInvocation): Promise<PluginRuntimeResult> {
    assertDomain(release.bundle.format === "host-module", "TRUSTED_RUNTIME_BUNDLE_REQUIRED", "Trusted runtime only accepts host-module releases", 500);
    const handler = this.#handlers.get(`${release.id}:${invocation.handler}`);
    assertDomain(handler, "PLUGIN_HANDLER_NOT_REGISTERED", `Plugin handler is not registered: ${invocation.handler}`, 500);
    return structuredClone(await handler(structuredClone(invocation)));
  }
}

export interface PluginRouteRequest {
  workspaceId: WorkspaceId;
  siteId?: SiteId | null;
  pluginKey: string;
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export class PluginService implements CmsLifecycleHooks {
  readonly store: PluginStore;
  readonly #cms: CmsService;
  readonly #security: PluginSecurityGateway;
  readonly #trustedRuntime: PluginRuntime;
  readonly #sandboxRuntime: PluginRuntime;
  readonly #clock: Clock;

  constructor(input: {
    store: PluginStore;
    cms: CmsService;
    security: PluginSecurityGateway;
    trustedRuntime: PluginRuntime;
    sandboxRuntime: PluginRuntime;
    clock?: Clock;
  }) {
    this.store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#trustedRuntime = input.trustedRuntime;
    this.#sandboxRuntime = input.sandboxRuntime;
    this.#clock = input.clock ?? systemClock;
  }

  async createPlugin(actor: ActorContext, input: { workspaceId: WorkspaceId; key: string; name: string; description?: string; trust: PluginTrust }): Promise<Plugin> {
    const key = normalizeKey(input.key);
    await this.#authorize(actor, Capabilities.PluginManage, { workspaceId: input.workspaceId, risk: "high" }, "plugin.create", "workspace", input.workspaceId);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_CREATION_REQUIRED", "Only a human can register a plugin identity", 403);
    const plugin: Plugin = {
      id: asPluginId(newId("plugin")), workspaceId: input.workspaceId, key,
      name: requiredText(input.name, 120), description: optionalText(input.description ?? "", 1000),
      trust: input.trust, state: "active", createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createPlugin(plugin);
    await this.#success(actor, plugin.workspaceId, null, "plugin.create", "plugin", plugin.id, Capabilities.PluginManage, { key, trust: plugin.trust });
    return plugin;
  }

  async listPlugins(actor: ActorContext, workspaceId: WorkspaceId): Promise<Plugin[]> {
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId, risk: "low" }, "plugin.list", "workspace", workspaceId);
    return this.store.listPlugins(workspaceId);
  }

  async createRelease(actor: ActorContext, input: { pluginId: PluginId; version: string; manifest: PluginManifest; bundle: PluginBundleDescriptor }): Promise<PluginRelease> {
    const plugin = await this.#requirePlugin(input.pluginId);
    await this.#authorize(actor, Capabilities.PluginManage, { workspaceId: plugin.workspaceId, risk: "high" }, "plugin.release.create", "plugin", plugin.id);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_RELEASE_REQUIRED", "Only a human can register a plugin release", 403);
    const manifest = validateManifest(input.manifest);
    assertDomain(manifest.key === plugin.key, "PLUGIN_MANIFEST_KEY_MISMATCH", "Manifest key does not match plugin key", 422);
    const bundle = validateBundle(input.bundle, plugin.trust);
    const version = validateVersion(input.version);
    const material = { pluginId: plugin.id, version, manifest, bundle };
    const release: PluginRelease = {
      id: asPluginReleaseId(newId("pluginRelease")), pluginId: plugin.id, version, manifest, bundle,
      releaseHash: await sha256(stableStringify(material)), state: "ready", createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createRelease(release);
    await this.#success(actor, plugin.workspaceId, null, "plugin.release.create", "plugin-release", release.id, Capabilities.PluginManage, {
      version, releaseHash: release.releaseHash, requestedCapabilities: manifest.capabilities,
    });
    return release;
  }

  async listReleases(actor: ActorContext, pluginId: PluginId): Promise<PluginRelease[]> {
    const plugin = await this.#requirePlugin(pluginId);
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId: plugin.workspaceId, risk: "low" }, "plugin.release.list", "plugin", plugin.id);
    return this.store.listReleases(plugin.id);
  }

  async listInvocations(actor: ActorContext, pluginReleaseId: PluginReleaseId): Promise<PluginInvocation[]> {
    const release = await this.#requireRelease(pluginReleaseId);
    const plugin = await this.#requirePlugin(release.pluginId);
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId: plugin.workspaceId, risk: "low" }, "plugin.invocation.list", "plugin-release", release.id);
    return this.store.listInvocations(release.id);
  }

  async activate(actor: ActorContext, input: {
    workspaceId: WorkspaceId;
    siteId?: SiteId | null;
    pluginReleaseId: PluginReleaseId;
    grantedCapabilities: PluginCapability[];
    allowedHosts?: string[];
  }): Promise<PluginActivation> {
    await this.#authorize(actor, Capabilities.PluginActivate, { workspaceId: input.workspaceId, ...(input.siteId ? { siteId: input.siteId } : {}), risk: "critical" }, "plugin.activate", "plugin-release", input.pluginReleaseId);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_ACTIVATION_REQUIRED", "Only a human can activate a plugin release", 403);
    const release = await this.#requireRelease(input.pluginReleaseId);
    const plugin = await this.#requirePlugin(release.pluginId);
    assertDomain(plugin.workspaceId === input.workspaceId, "PLUGIN_WORKSPACE_MISMATCH", "Plugin belongs to another workspace", 422);
    if (input.siteId) {
      const site = await this.#cms.store.getSite(input.siteId);
      assertDomain(site?.workspaceId === input.workspaceId, "PLUGIN_SITE_WORKSPACE_MISMATCH", "Site belongs to another workspace", 422);
    }
    const grantedCapabilities = unique(input.grantedCapabilities);
    assertDomain(grantedCapabilities.every((capability) => release.manifest.capabilities.includes(capability)), "PLUGIN_CAPABILITY_NOT_REQUESTED", "Granted capability was not requested by the manifest", 422);
    const allowedHosts = unique((input.allowedHosts ?? []).map(normalizeHostPattern));
    assertDomain(allowedHosts.every((host) => release.manifest.network.allowedHosts.includes(host)), "PLUGIN_HOST_NOT_REQUESTED", "Allowed network host was not requested by the manifest", 422);
    if (allowedHosts.length > 0) assertDomain(grantedCapabilities.includes(PluginCapabilities.NetworkRequest), "PLUGIN_NETWORK_CAPABILITY_REQUIRED", "Network hosts require network:request capability", 422);
    const activation: PluginActivation = {
      id: asPluginActivationId(newId("pluginActivation")), workspaceId: input.workspaceId, siteId: input.siteId ?? null,
      pluginReleaseId: release.id, grantedCapabilities, allowedHosts, state: "active", activatedBy: actor.actorId,
      activatedAt: this.#clock.now(), deactivatedAt: null,
    };
    await this.store.activate(activation);
    await this.#success(actor, input.workspaceId, input.siteId ?? null, "plugin.activate", "plugin-release", release.id, Capabilities.PluginActivate, {
      activationId: activation.id, grantedCapabilities, allowedHosts, trust: plugin.trust,
    });
    return activation;
  }

  async deactivate(actor: ActorContext, activationId: PluginActivationId): Promise<void> {
    const activation = await this.#requireActivation(activationId);
    await this.#authorize(actor, Capabilities.PluginActivate, { workspaceId: activation.workspaceId, ...(activation.siteId ? { siteId: activation.siteId } : {}), risk: "high" }, "plugin.deactivate", "plugin-activation", activation.id);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_ACTIVATION_REQUIRED", "Only a human can deactivate a plugin", 403);
    await this.store.deactivate(activation.id, this.#clock.now());
    await this.#success(actor, activation.workspaceId, activation.siteId, "plugin.deactivate", "plugin-activation", activation.id, Capabilities.PluginActivate, {});
  }

  async listActivations(actor: ActorContext, workspaceId: WorkspaceId, siteId?: SiteId | null): Promise<Array<{ activation: PluginActivation; plugin: Plugin; release: PluginRelease }>> {
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId, ...(siteId ? { siteId } : {}), risk: "low" }, "plugin.activation.list", "workspace", workspaceId);
    const result = [];
    const activations = siteId === undefined
      ? await this.store.listActiveActivations(workspaceId)
      : await this.#effectiveActivations(workspaceId, siteId);
    for (const activation of activations) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const plugin = await this.#requirePlugin(release.pluginId);
      result.push({ activation, plugin, release });
    }
    return result;
  }

  async listAdminExtensions(actor: ActorContext, workspaceId: WorkspaceId, siteId?: SiteId | null): Promise<Array<{ pluginKey: string; releaseId: PluginReleaseId; pages: PluginAdminPageManifest[]; widgets: PluginAdminWidgetManifest[] }>> {
    const active = await this.listActivations(actor, workspaceId, siteId);
    return active.map(({ plugin, release, activation }) => ({
      pluginKey: plugin.key, releaseId: release.id,
      pages: activation.grantedCapabilities.includes(PluginCapabilities.AdminPage) ? structuredClone(release.manifest.admin.pages) : [],
      widgets: activation.grantedCapabilities.includes(PluginCapabilities.AdminWidget) ? structuredClone(release.manifest.admin.widgets) : [],
    })).filter((value) => value.pages.length > 0 || value.widgets.length > 0);
  }

  async invokeRoute(actor: ActorContext, input: PluginRouteRequest): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    await this.#authorize(actor, Capabilities.PluginInvoke, { workspaceId: input.workspaceId, ...(input.siteId ? { siteId: input.siteId } : {}), risk: input.method === "GET" ? "low" : "medium" }, "plugin.route.invoke", "plugin", input.pluginKey);
    const plugin = await this.store.getPluginByKey(input.workspaceId, normalizeKey(input.pluginKey));
    assertDomain(plugin, "PLUGIN_NOT_FOUND", "Plugin not found", 404);
    const activation = await this.#findActivationForPlugin(input.workspaceId, input.siteId ?? null, plugin.id);
    const release = await this.#requireRelease(activation.pluginReleaseId);
    assertDomain(activation.grantedCapabilities.includes(PluginCapabilities.ApiRoute), "PLUGIN_ROUTE_CAPABILITY_NOT_GRANTED", "Plugin route capability is not granted", 403);
    const routePath = normalizeRoutePath(input.path);
    const route = release.manifest.routes.find((candidate) => candidate.method === input.method && candidate.path === routePath);
    assertDomain(route, "PLUGIN_ROUTE_NOT_FOUND", "Plugin route not found", 404);
    const result = await this.#invoke(plugin, release, activation, {
      kind: "route", handler: route.handler,
      route: { method: input.method, path: routePath, query: input.query ?? {}, headers: safeHeaders(input.headers ?? {}), body: input.body ?? null },
      context: this.#runtimeContext(actor.requestId, activation),
    }, { routeId: route.id });
    assertDomain(result.response, "PLUGIN_ROUTE_RESPONSE_REQUIRED", "Plugin route did not return a response", 502);
    return { status: validStatus(result.response.status), headers: safeResponseHeaders(result.response.headers ?? {}), body: String(result.response.body ?? "") };
  }

  async beforePublish(event: CmsLifecyclePublishEvent): Promise<void> {
    await this.dispatchHook(PluginHooks.ContentBeforePublish, event.workspaceId, event.siteId, {
      contentItemId: event.contentItemId, revisionId: event.revisionId, approvalId: event.approvalId,
      contentType: event.contentType, path: event.path, actorType: event.actor.actorType,
    }, event.actor.requestId, true);
  }

  async afterPublish(event: CmsLifecyclePublishEvent): Promise<void> {
    await this.dispatchHook(PluginHooks.ContentAfterPublish, event.workspaceId, event.siteId, {
      contentItemId: event.contentItemId, revisionId: event.revisionId, approvalId: event.approvalId,
      contentType: event.contentType, path: event.path, actorType: event.actor.actorType,
    }, event.actor.requestId, false);
  }

  async dispatchHook(hookName: PluginHookName, workspaceId: WorkspaceId, siteId: SiteId | null, event: Record<string, unknown>, requestId: string, critical = false): Promise<void> {
    for (const activation of await this.#effectiveActivations(workspaceId, siteId)) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const plugin = await this.#requirePlugin(release.pluginId);
      if ((hookName === PluginHooks.ContentBeforePublish || hookName === PluginHooks.ContentAfterPublish)
        && !activation.grantedCapabilities.includes(PluginCapabilities.ContentRead)) continue;
      for (const hook of release.manifest.hooks.filter((candidate) => candidate.name === hookName)) {
        const result = await this.#invoke(plugin, release, activation, {
          kind: "hook", hookName, handler: hook.handler, event: structuredClone(event), context: this.#runtimeContext(requestId, activation),
        }, { hookName, failureMode: hook.failureMode, critical });
        const blocked = result.output?.blocked === true;
        if (blocked && critical) throw new DomainError("PLUGIN_POLICY_BLOCKED", String(result.output?.reason ?? `Plugin ${plugin.key} blocked the operation`), 409, { pluginKey: plugin.key, hookName });
      }
    }
  }

  async #invoke(plugin: Plugin, release: PluginRelease, activation: PluginActivation, invocation: PluginRuntimeInvocation, meta: { hookName?: PluginHookName; routeId?: string; failureMode?: "continue" | "block"; critical?: boolean }): Promise<PluginRuntimeResult> {
    const started = this.#clock.now();
    let result: PluginRuntimeResult;
    try {
      result = await (plugin.trust === "trusted" ? this.#trustedRuntime : this.#sandboxRuntime).invoke(release, invocation);
    } catch (error) {
      result = { ok: false, error: { code: "PLUGIN_RUNTIME_ERROR", message: error instanceof Error ? error.message : "Plugin runtime failed" } };
    }
    const blocked = result.output?.blocked === true;
    await this.store.recordInvocation({
      id: asPluginInvocationId(newId("pluginInvocation")), pluginReleaseId: release.id, activationId: activation.id,
      hookName: meta.hookName ?? null, routeId: meta.routeId ?? null, requestId: invocation.context.requestId,
      state: blocked ? "blocked" : result.ok ? "succeeded" : "failed", durationMs: Math.max(0, this.#clock.now() - started),
      errorCode: result.error?.code ?? null, createdAt: started,
    });
    if (!result.ok && (meta.critical || meta.failureMode === "block" || invocation.kind === "route")) {
      throw new DomainError(result.error?.code ?? "PLUGIN_EXECUTION_FAILED", result.error?.message ?? "Plugin execution failed", 502, { pluginKey: plugin.key, releaseId: release.id });
    }
    return result;
  }

  #runtimeContext(requestId: string, activation: PluginActivation): PluginRuntimeInvocation["context"] {
    return { requestId, workspaceId: activation.workspaceId, siteId: activation.siteId, capabilities: [...activation.grantedCapabilities], allowedHosts: [...activation.allowedHosts] };
  }

  async #effectiveActivations(workspaceId: WorkspaceId, siteId: SiteId | null): Promise<PluginActivation[]> {
    const candidates = await this.store.listActiveActivations(workspaceId, siteId);
    if (siteId === null) return candidates.filter((activation) => activation.siteId === null);
    const byPlugin = new Map<PluginId, PluginActivation>();
    for (const activation of candidates) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const current = byPlugin.get(release.pluginId);
      if (!current || activation.siteId === siteId) byPlugin.set(release.pluginId, activation);
    }
    return [...byPlugin.values()].sort((a, b) => a.activatedAt - b.activatedAt);
  }

  async #findActivationForPlugin(workspaceId: WorkspaceId, siteId: SiteId | null, pluginId: PluginId): Promise<PluginActivation> {
    for (const activation of await this.#effectiveActivations(workspaceId, siteId)) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      if (release.pluginId === pluginId) return activation;
    }
    throw new DomainError("PLUGIN_NOT_ACTIVE", "Plugin is not active for this scope", 404);
  }
  async #requirePlugin(id: PluginId): Promise<Plugin> { const value = await this.store.getPlugin(id); assertDomain(value, "PLUGIN_NOT_FOUND", "Plugin not found", 404); return value; }
  async #requireRelease(id: PluginReleaseId): Promise<PluginRelease> { const value = await this.store.getRelease(id); assertDomain(value, "PLUGIN_RELEASE_NOT_FOUND", "Plugin release not found", 404); return value; }
  async #requireActivation(id: PluginActivationId): Promise<PluginActivation> { const value = await this.store.getActivation(id); assertDomain(value, "PLUGIN_ACTIVATION_NOT_FOUND", "Plugin activation not found", 404); return value; }
  #authorize(actor: ActorContext, capability: string, resource: AuthorizationResource, action: string, resourceType: string, resourceId: string) { return this.#security.authorize(actor, capability, resource, action, resourceType, resourceId); }
  #success(actor: ActorContext, workspaceId: WorkspaceId, siteId: SiteId | null, action: string, resourceType: string, resourceId: string, capability: string, details: Record<string, unknown>) { return this.#security.success(actor, { workspaceId, siteId, action, resourceType, resourceId, capability, details }); }
}

export class MemoryPluginStore implements PluginStore {
  readonly plugins = new Map<PluginId, Plugin>();
  readonly releases = new Map<PluginReleaseId, PluginRelease>();
  readonly activations = new Map<PluginActivationId, PluginActivation>();
  readonly invocations = new Map<PluginInvocationId, PluginInvocation>();
  async createPlugin(plugin: Plugin): Promise<void> {
    assertDomain(![...this.plugins.values()].some((value) => value.workspaceId === plugin.workspaceId && value.key === plugin.key), "PLUGIN_KEY_EXISTS", "Plugin key already exists", 409);
    this.plugins.set(plugin.id, structuredClone(plugin));
  }
  async getPlugin(id: PluginId): Promise<Plugin | null> { return clone(this.plugins.get(id)); }
  async getPluginByKey(workspaceId: WorkspaceId, key: string): Promise<Plugin | null> { return clone([...this.plugins.values()].find((value) => value.workspaceId === workspaceId && value.key === key)); }
  async listPlugins(workspaceId: WorkspaceId): Promise<Plugin[]> { return [...this.plugins.values()].filter((value) => value.workspaceId === workspaceId).map((value) => structuredClone(value)); }
  async createRelease(release: PluginRelease): Promise<void> {
    assertDomain(![...this.releases.values()].some((value) => value.pluginId === release.pluginId && value.version === release.version), "PLUGIN_VERSION_EXISTS", "Plugin release version already exists", 409);
    this.releases.set(release.id, structuredClone(release));
  }
  async getRelease(id: PluginReleaseId): Promise<PluginRelease | null> { return clone(this.releases.get(id)); }
  async listReleases(pluginId: PluginId): Promise<PluginRelease[]> { return [...this.releases.values()].filter((value) => value.pluginId === pluginId).sort((a,b)=>b.createdAt-a.createdAt).map((value)=>structuredClone(value)); }
  async activate(activation: PluginActivation): Promise<void> {
    const release = this.releases.get(activation.pluginReleaseId);
    assertDomain(release, "PLUGIN_RELEASE_NOT_FOUND", "Plugin release not found", 404);
    for (const current of this.activations.values()) {
      const currentRelease = this.releases.get(current.pluginReleaseId);
      if (current.state === "active" && current.workspaceId === activation.workspaceId && current.siteId === activation.siteId && currentRelease?.pluginId === release.pluginId) {
        current.state = "disabled"; current.deactivatedAt = activation.activatedAt;
      }
    }
    this.activations.set(activation.id, structuredClone(activation));
  }
  async deactivate(activationId: PluginActivationId, at: number): Promise<void> { const value=this.activations.get(activationId);assertDomain(value,"PLUGIN_ACTIVATION_NOT_FOUND","Plugin activation not found",404);value.state="disabled";value.deactivatedAt=at; }
  async getActivation(id: PluginActivationId): Promise<PluginActivation | null> { return clone(this.activations.get(id)); }
  async listActiveActivations(workspaceId: WorkspaceId, siteId?: SiteId | null): Promise<PluginActivation[]> {
    return [...this.activations.values()].filter((value) => value.workspaceId === workspaceId && value.state === "active" && (
      siteId === undefined ? true : value.siteId === null || value.siteId === siteId
    )).sort((a,b)=>a.activatedAt-b.activatedAt).map((value)=>structuredClone(value));
  }
  async recordInvocation(invocation: PluginInvocation): Promise<void> { this.invocations.set(invocation.id, structuredClone(invocation)); }
  async listInvocations(pluginReleaseId: PluginReleaseId): Promise<PluginInvocation[]> { return [...this.invocations.values()].filter((value)=>value.pluginReleaseId===pluginReleaseId).map((value)=>structuredClone(value)); }
}

export function validateManifest(input: PluginManifest): PluginManifest {
  assertDomain(input?.manifestVersion === 1, "UNSUPPORTED_PLUGIN_MANIFEST", "Plugin manifest version must be 1", 422);
  const key = normalizeKey(input.key);
  const capabilities = unique(input.capabilities ?? []);
  assertDomain(capabilities.length <= 32 && capabilities.every((value) => PLUGIN_CAPABILITY_SET.has(value)), "INVALID_PLUGIN_CAPABILITY", "Plugin manifest contains an unknown capability", 422);
  const hooks = (input.hooks ?? []).map((hook) => {
    assertDomain(PLUGIN_HOOK_SET.has(hook.name), "INVALID_PLUGIN_HOOK", "Plugin manifest contains an unknown hook", 422);
    const failureMode = hook.failureMode === "block" ? "block" as const : "continue" as const;
    assertDomain(
      hook.name === PluginHooks.ContentBeforePublish || failureMode === "continue",
      "PLUGIN_AFTER_HOOK_CANNOT_BLOCK",
      "Post-commit plugin hooks must use failureMode=continue",
      422,
    );
    return { name: hook.name, handler: handlerName(hook.handler), failureMode };
  });
  assertDomain(hooks.length <= 32 && unique(hooks.map((value)=>`${value.name}:${value.handler}`)).length === hooks.length, "INVALID_PLUGIN_HOOKS", "Plugin hooks are duplicated or exceed limits", 422);
  if (hooks.some((hook)=>hook.name === PluginHooks.ContentBeforePublish || hook.name === PluginHooks.ContentAfterPublish)) assertDomain(capabilities.includes(PluginCapabilities.ContentRead), "PLUGIN_CONTENT_HOOK_CAPABILITY_REQUIRED", "Content hooks require content:read capability", 422);
  const routes = (input.routes ?? []).map((route) => ({ id: manifestId(route.id), method: route.method, path: normalizeRoutePath(route.path), handler: handlerName(route.handler) }));
  assertDomain(routes.length <= 16 && routes.every((route) => route.method === "GET" || route.method === "POST"), "INVALID_PLUGIN_ROUTES", "Plugin routes are invalid", 422);
  assertDomain(unique(routes.map((route)=>`${route.method}:${route.path}`)).length === routes.length, "DUPLICATE_PLUGIN_ROUTE", "Plugin routes must be unique", 422);
  const pages = (input.admin?.pages ?? []).map((page) => ({ id: manifestId(page.id), title: requiredText(page.title, 80), path: normalizeAdminPath(page.path) }));
  const widgets = (input.admin?.widgets ?? []).map((widget) => ({ id: manifestId(widget.id), title: requiredText(widget.title, 80), placement: widget.placement }));
  assertDomain(widgets.every((widget) => widget.placement === "dashboard" || widget.placement === "content-sidebar"), "INVALID_PLUGIN_WIDGET", "Plugin widget placement is invalid", 422);
  assertDomain(pages.length <= 16 && widgets.length <= 16, "PLUGIN_ADMIN_LIMIT_EXCEEDED", "Plugin admin extensions exceed limits", 422);
  const allowedHosts = unique((input.network?.allowedHosts ?? []).map(normalizeHostPattern));
  assertDomain(allowedHosts.length <= 32, "PLUGIN_HOST_LIMIT_EXCEEDED", "Plugin network host allowlist exceeds limits", 422);
  const storage: PluginStorageManifest = {
    kvNamespaces: unique((input.storage?.kvNamespaces ?? []).map(storageKey)),
    collections: (input.storage?.collections ?? []).map((collection) => ({ key: storageKey(collection.key), maxBytes: integerRange(collection.maxBytes, 1024, 10 * 1024 * 1024, "collection.maxBytes") })),
  };
  assertDomain(storage.kvNamespaces.length <= 8 && storage.collections.length <= 8, "PLUGIN_STORAGE_LIMIT_EXCEEDED", "Plugin storage declarations exceed limits", 422);
  if (routes.length > 0) assertDomain(capabilities.includes(PluginCapabilities.ApiRoute), "PLUGIN_ROUTE_CAPABILITY_REQUIRED", "Routes require api:route capability", 422);
  if (pages.length > 0) assertDomain(capabilities.includes(PluginCapabilities.AdminPage), "PLUGIN_ADMIN_CAPABILITY_REQUIRED", "Admin pages require admin:page capability", 422);
  if (widgets.length > 0) assertDomain(capabilities.includes(PluginCapabilities.AdminWidget), "PLUGIN_WIDGET_CAPABILITY_REQUIRED", "Admin widgets require admin:widget capability", 422);
  if (allowedHosts.length > 0) assertDomain(capabilities.includes(PluginCapabilities.NetworkRequest), "PLUGIN_NETWORK_CAPABILITY_REQUIRED", "Network hosts require network:request capability", 422);
  if (storage.kvNamespaces.length > 0 || storage.collections.length > 0) assertDomain(capabilities.includes(PluginCapabilities.StorageRead) || capabilities.includes(PluginCapabilities.StorageWrite), "PLUGIN_STORAGE_CAPABILITY_REQUIRED", "Storage declarations require storage capability", 422);
  const source = input.source ?? { kind: "native" as const };
  assertDomain(["native","basercms-migration","emdash-derived"].includes(source.kind), "INVALID_PLUGIN_SOURCE", "Plugin source is invalid", 422);
  return {
    manifestVersion: 1, key, name: requiredText(input.name,120), description: optionalText(input.description ?? "",1000), capabilities,
    hooks, routes, admin:{pages,widgets}, network:{allowedHosts}, storage,
    source:{kind:source.kind,...(source.reference?{reference:optionalText(source.reference,500)}:{})},
  };
}

function validateBundle(input: PluginBundleDescriptor, trust: PluginTrust): PluginBundleDescriptor {
  assertDomain(input && typeof input === "object", "INVALID_PLUGIN_BUNDLE", "Plugin bundle descriptor is required", 422);
  const expected = trust === "trusted" ? "host-module" : "worker-module";
  assertDomain(input.format === expected, "PLUGIN_BUNDLE_TRUST_MISMATCH", `Plugin trust ${trust} requires ${expected}`, 422);
  const entrypoint = requiredText(input.entrypoint, 240);
  assertDomain(!entrypoint.includes("..") && !entrypoint.startsWith("/") && /^[a-zA-Z0-9_./:@-]+$/.test(entrypoint), "INVALID_PLUGIN_ENTRYPOINT", "Plugin entrypoint is invalid", 422);
  const sizeBytes = integerRange(input.sizeBytes, 1, trust === "sandboxed" ? 256 * 1024 : 2 * 1024 * 1024, "bundle.sizeBytes");
  const digest = input.sha256.toLowerCase();
  assertDomain(/^[a-f0-9]{64}$/.test(digest), "INVALID_PLUGIN_BUNDLE_HASH", "Plugin bundle hash must be SHA-256", 422);
  return { format: expected, entrypoint, sizeBytes, sha256: digest };
}
function normalizeKey(value:string):string{const key=String(value).trim().toLowerCase();assertDomain(/^[a-z][a-z0-9-]{1,62}$/.test(key),"INVALID_PLUGIN_KEY","Plugin key must be lowercase ASCII with hyphens",422);return key;}
function validateVersion(value:string):string{const version=String(value).trim();assertDomain(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version),"INVALID_PLUGIN_VERSION","Plugin release version must use semantic versioning",422);return version;}
function normalizeRoutePath(value:string):string{const path=String(value).trim();assertDomain(/^\/[a-zA-Z0-9/_-]*$/.test(path)&&!path.includes("//")&&!path.includes("..")&&path.length<=160,"INVALID_PLUGIN_ROUTE_PATH","Plugin route path is invalid",422);return path||"/";}
function normalizeAdminPath(value:string):string{const path=normalizeRoutePath(value);assertDomain(path.startsWith("/plugins/"),"INVALID_PLUGIN_ADMIN_PATH","Plugin admin page must be under /plugins/",422);return path;}
function normalizeHostPattern(value:string):string{const host=String(value).trim().toLowerCase();assertDomain(/^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(host)&&!host.includes("..")&&!host.includes(":")&&!host.includes("/"),"INVALID_PLUGIN_HOST","Plugin network host is invalid",422);return host;}
function handlerName(value:string):string{const name=String(value).trim();assertDomain(/^[a-zA-Z][a-zA-Z0-9_.-]{0,119}$/.test(name),"INVALID_PLUGIN_HANDLER","Plugin handler name is invalid",422);return name;}
function manifestId(value:string):string{const id=String(value).trim();assertDomain(/^[a-z][a-z0-9-]{0,62}$/.test(id),"INVALID_PLUGIN_MANIFEST_ID","Plugin manifest id is invalid",422);return id;}
function storageKey(value:string):string{const key=String(value).trim();assertDomain(/^[a-z][a-z0-9_-]{0,62}$/.test(key),"INVALID_PLUGIN_STORAGE_KEY","Plugin storage key is invalid",422);return key;}
function requiredText(value:string,max:number):string{const result=String(value).trim();assertDomain(result.length>0&&result.length<=max,"INVALID_TEXT","Required text is empty or too long",422);return result;}
function optionalText(value:string,max:number):string{const result=String(value).trim();assertDomain(result.length<=max,"TEXT_TOO_LONG","Text is too long",422);return result;}
function integerRange(value:number,min:number,max:number,name:string):number{assertDomain(Number.isInteger(value)&&value>=min&&value<=max,"INVALID_PLUGIN_LIMIT",`${name} is outside the allowed range`,422);return value;}
function unique<T>(values:readonly T[]):T[]{return [...new Set(values)];}
function clone<T>(value:T|undefined):T|null{return value===undefined?null:structuredClone(value);}
function safeHeaders(input:Record<string,string>):Record<string,string>{const result:Record<string,string>={};for(const [key,value] of Object.entries(input)){const name=key.toLowerCase();if(["authorization","cookie","cf-access-jwt-assertion","x-baser-principal-id"].includes(name))continue;if(/^[a-z0-9-]{1,64}$/.test(name)&&String(value).length<=2048)result[name]=String(value);}return result;}
function safeResponseHeaders(input:Record<string,string>):Record<string,string>{const result:Record<string,string>={};for(const [key,value] of Object.entries(input)){const name=key.toLowerCase();if(["set-cookie","location","content-security-policy","access-control-allow-origin"].includes(name))continue;if(["content-type","cache-control","etag","x-plugin-result"].includes(name)&&String(value).length<=2048)result[name]=String(value);}return result;}
function validStatus(value:number):number{return Number.isInteger(value)&&value>=200&&value<=599?value:200;}
