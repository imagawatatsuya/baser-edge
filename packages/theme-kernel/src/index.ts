import {
  assertDomain,
  asDesignTokenRevisionId,
  asLayoutRevisionId,
  asThemeActivationId,
  asThemeId,
  asThemeReleaseId,
  newId,
  sha256,
  stableStringify,
  systemClock,
  type ActorContext,
  type Clock,
  type DesignTokenRevisionId,
  type LayoutRevisionId,
  type PrincipalId,
  type SiteId,
  type ThemeActivationId,
  type ThemeId,
  type ThemeReleaseId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { Capabilities, type AuthorizationResource } from "@baser-edge/authorization";
import type { CmsService } from "@baser-edge/content-kernel";

export type ThemeState = "active" | "disabled";
export type ThemeReleaseState = "ready" | "retired";

export interface Theme {
  id: ThemeId;
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  description: string;
  state: ThemeState;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface DesignTokens {
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorMuted: string;
  colorAccent: string;
  colorBorder: string;
  fontFamily: string;
  baseFontSize: number;
  lineHeight: number;
  contentMaxWidth: number;
  spacingScale: number;
  radius: number;
}

export interface DesignTokenRevision {
  id: DesignTokenRevisionId;
  themeId: ThemeId;
  revisionNumber: number;
  name: string;
  tokens: DesignTokens;
  contentHash: string;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface LayoutDefinition {
  header: "none" | "simple" | "brand";
  navigation: "none" | "top";
  footer: "none" | "simple";
  showSiteName: boolean;
  footerText: string;
  mainClass: string;
}

export interface LayoutRevision {
  id: LayoutRevisionId;
  themeId: ThemeId;
  revisionNumber: number;
  name: string;
  layout: LayoutDefinition;
  contentHash: string;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface ThemeReleaseManifest {
  rendererApiVersion: 1;
  variant: "light" | "dark" | "auto";
  supportedContentTypes: string[];
  cssText: string;
  source: {
    kind: "native" | "basercms-migration" | "emdash-derived";
    reference?: string;
  };
}

export interface ThemeRelease {
  id: ThemeReleaseId;
  themeId: ThemeId;
  version: string;
  designTokenRevisionId: DesignTokenRevisionId;
  layoutRevisionId: LayoutRevisionId;
  manifest: ThemeReleaseManifest;
  releaseHash: string;
  state: ThemeReleaseState;
  createdBy: PrincipalId;
  createdAt: number;
}

export interface SiteThemeActivation {
  id: ThemeActivationId;
  siteId: SiteId;
  themeReleaseId: ThemeReleaseId;
  activatedBy: PrincipalId;
  activatedAt: number;
  deactivatedAt: number | null;
}

export interface ResolvedThemePresentation {
  theme: Theme;
  release: ThemeRelease;
  tokenRevision: DesignTokenRevision;
  layoutRevision: LayoutRevision;
  activation: SiteThemeActivation | null;
  builtin: boolean;
}

export interface ThemeStore {
  createTheme(theme: Theme): Promise<void>;
  getTheme(id: ThemeId): Promise<Theme | null>;
  listThemes(workspaceId: WorkspaceId): Promise<Theme[]>;
  createTokenRevision(revision: DesignTokenRevision): Promise<void>;
  getTokenRevision(id: DesignTokenRevisionId): Promise<DesignTokenRevision | null>;
  countTokenRevisions(themeId: ThemeId): Promise<number>;
  createLayoutRevision(revision: LayoutRevision): Promise<void>;
  getLayoutRevision(id: LayoutRevisionId): Promise<LayoutRevision | null>;
  countLayoutRevisions(themeId: ThemeId): Promise<number>;
  createRelease(release: ThemeRelease): Promise<void>;
  getRelease(id: ThemeReleaseId): Promise<ThemeRelease | null>;
  listReleases(themeId: ThemeId): Promise<ThemeRelease[]>;
  activate(activation: SiteThemeActivation): Promise<void>;
  getActiveActivation(siteId: SiteId): Promise<SiteThemeActivation | null>;
}

export interface ThemeSecurityGateway {
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

export class ThemeService {
  readonly store: ThemeStore;
  readonly #cms: CmsService;
  readonly #security: ThemeSecurityGateway;
  readonly #clock: Clock;

  constructor(input: { store: ThemeStore; cms: CmsService; security: ThemeSecurityGateway; clock?: Clock }) {
    this.store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#clock = input.clock ?? systemClock;
  }

  async createTheme(actor: ActorContext, input: { workspaceId: WorkspaceId; key: string; name: string; description?: string }): Promise<Theme> {
    const key = normalizeKey(input.key);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: input.workspaceId, risk: "medium" }, "theme.create", "theme", key);
    const theme: Theme = {
      id: asThemeId(newId("theme")), workspaceId: input.workspaceId, key, name: requiredText(input.name, 120),
      description: optionalText(input.description ?? "", 1000), state: "active", createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createTheme(theme);
    await this.#success(actor, theme.workspaceId, null, "theme.create", "theme", theme.id, Capabilities.ThemeManage, { key: theme.key });
    return theme;
  }

  async listThemes(actor: ActorContext, workspaceId: WorkspaceId): Promise<Theme[]> {
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId, risk: "low" }, "theme.list", "workspace", workspaceId);
    return this.store.listThemes(workspaceId);
  }

  async createTokenRevision(actor: ActorContext, input: { themeId: ThemeId; name: string; tokens: DesignTokens }): Promise<DesignTokenRevision> {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "medium" }, "theme.tokens.create", "theme", theme.id);
    const tokens = validateTokens(input.tokens);
    const revision: DesignTokenRevision = {
      id: asDesignTokenRevisionId(newId("designTokenRevision")), themeId: theme.id,
      revisionNumber: await this.store.countTokenRevisions(theme.id) + 1,
      name: requiredText(input.name, 120), tokens,
      contentHash: await sha256(stableStringify(tokens)), createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createTokenRevision(revision);
    await this.#success(actor, theme.workspaceId, null, "theme.tokens.create", "design-token-revision", revision.id, Capabilities.ThemeManage, { revisionNumber: revision.revisionNumber });
    return revision;
  }

  async createLayoutRevision(actor: ActorContext, input: { themeId: ThemeId; name: string; layout: LayoutDefinition }): Promise<LayoutRevision> {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "medium" }, "theme.layout.create", "theme", theme.id);
    const layout = validateLayout(input.layout);
    const revision: LayoutRevision = {
      id: asLayoutRevisionId(newId("layoutRevision")), themeId: theme.id,
      revisionNumber: await this.store.countLayoutRevisions(theme.id) + 1,
      name: requiredText(input.name, 120), layout,
      contentHash: await sha256(stableStringify(layout)), createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createLayoutRevision(revision);
    await this.#success(actor, theme.workspaceId, null, "theme.layout.create", "layout-revision", revision.id, Capabilities.ThemeManage, { revisionNumber: revision.revisionNumber });
    return revision;
  }

  async createRelease(actor: ActorContext, input: {
    themeId: ThemeId;
    version: string;
    designTokenRevisionId: DesignTokenRevisionId;
    layoutRevisionId: LayoutRevisionId;
    manifest: ThemeReleaseManifest;
  }): Promise<ThemeRelease> {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "high" }, "theme.release.create", "theme", theme.id);
    const tokens = await this.store.getTokenRevision(input.designTokenRevisionId);
    const layout = await this.store.getLayoutRevision(input.layoutRevisionId);
    assertDomain(tokens?.themeId === theme.id, "THEME_TOKEN_MISMATCH", "Design token revision belongs to another theme", 422);
    assertDomain(layout?.themeId === theme.id, "THEME_LAYOUT_MISMATCH", "Layout revision belongs to another theme", 422);
    const manifest = validateManifest(input.manifest);
    const version = validateVersion(input.version);
    const releaseMaterial = { themeId: theme.id, version, designTokenRevisionId: tokens.id, layoutRevisionId: layout.id, manifest };
    const release: ThemeRelease = {
      id: asThemeReleaseId(newId("themeRelease")), themeId: theme.id, version,
      designTokenRevisionId: tokens.id, layoutRevisionId: layout.id, manifest,
      releaseHash: await sha256(stableStringify(releaseMaterial)), state: "ready", createdBy: actor.actorId, createdAt: this.#clock.now(),
    };
    await this.store.createRelease(release);
    await this.#success(actor, theme.workspaceId, null, "theme.release.create", "theme-release", release.id, Capabilities.ThemeManage, { version, releaseHash: release.releaseHash });
    return release;
  }

  async listReleases(actor: ActorContext, themeId: ThemeId): Promise<ThemeRelease[]> {
    const theme = await this.#requireTheme(themeId);
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId: theme.workspaceId, risk: "low" }, "theme.release.list", "theme", theme.id);
    return this.store.listReleases(theme.id);
  }

  async activate(actor: ActorContext, input: { siteId: SiteId; themeReleaseId: ThemeReleaseId }): Promise<ResolvedThemePresentation> {
    assertDomain(actor.actorType === "human", "HUMAN_THEME_ACTIVATION_REQUIRED", "Theme activation requires a human principal", 403);
    const site = await this.#cms.store.getSite(input.siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    const release = await this.#requireRelease(input.themeReleaseId);
    const theme = await this.#requireTheme(release.themeId);
    assertDomain(theme.workspaceId === site.workspaceId, "CROSS_WORKSPACE_THEME", "Theme belongs to another workspace", 422);
    assertDomain(release.state === "ready", "THEME_RELEASE_NOT_READY", "Theme release is not ready", 409);
    await this.#authorize(actor, Capabilities.ThemeActivate, { workspaceId: site.workspaceId, siteId: site.id, risk: "high" }, "theme.activate", "site", site.id);
    const activation: SiteThemeActivation = {
      id: asThemeActivationId(newId("themeActivation")), siteId: site.id, themeReleaseId: release.id,
      activatedBy: actor.actorId, activatedAt: this.#clock.now(), deactivatedAt: null,
    };
    await this.store.activate(activation);
    await this.#success(actor, site.workspaceId, site.id, "theme.activate", "theme-release", release.id, Capabilities.ThemeActivate, { releaseHash: release.releaseHash });
    return this.resolveRelease(release.id, site.id, activation);
  }

  async getActive(actor: ActorContext, siteId: SiteId): Promise<ResolvedThemePresentation> {
    const site = await this.#cms.store.getSite(siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "theme.active.read", "site", site.id);
    return this.resolveActive(siteId);
  }

  async resolveActive(siteId: SiteId): Promise<ResolvedThemePresentation> {
    const activation = await this.store.getActiveActivation(siteId);
    if (!activation) return builtinTheme();
    return this.resolveRelease(activation.themeReleaseId, siteId, activation);
  }

  async resolveRelease(releaseId: ThemeReleaseId | string, siteId?: SiteId, knownActivation?: SiteThemeActivation | null): Promise<ResolvedThemePresentation> {
    if (String(releaseId) === BUILTIN_RELEASE_ID || String(releaseId) === "default@1") return builtinTheme();
    const release = await this.#requireRelease(asThemeReleaseId(String(releaseId)));
    const theme = await this.#requireTheme(release.themeId);
    const tokenRevision = await this.store.getTokenRevision(release.designTokenRevisionId);
    const layoutRevision = await this.store.getLayoutRevision(release.layoutRevisionId);
    assertDomain(tokenRevision && layoutRevision, "THEME_RELEASE_INCOMPLETE", "Theme release references missing immutable artifacts", 500);
    const activation = knownActivation ?? (siteId ? await this.store.getActiveActivation(siteId) : null);
    return { theme, release, tokenRevision, layoutRevision, activation: activation?.themeReleaseId === release.id ? activation : null, builtin: false };
  }

  async #requireTheme(id: ThemeId): Promise<Theme> { const value = await this.store.getTheme(id); assertDomain(value, "THEME_NOT_FOUND", "Theme not found", 404); return value; }
  async #requireRelease(id: ThemeReleaseId): Promise<ThemeRelease> { const value = await this.store.getRelease(id); assertDomain(value, "THEME_RELEASE_NOT_FOUND", "Theme release not found", 404); return value; }
  #authorize(actor: ActorContext, capability: string, resource: AuthorizationResource, action: string, resourceType: string, resourceId: string) { return this.#security.authorize(actor, capability, resource, action, resourceType, resourceId); }
  #success(actor: ActorContext, workspaceId: WorkspaceId, siteId: SiteId | null, action: string, resourceType: string, resourceId: string, capability: string, details: Record<string, unknown>) { return this.#security.success(actor, { workspaceId, siteId, action, resourceType, resourceId, capability, details }); }
}

export class MemoryThemeStore implements ThemeStore {
  readonly themes = new Map<ThemeId, Theme>();
  readonly tokenRevisions = new Map<DesignTokenRevisionId, DesignTokenRevision>();
  readonly layoutRevisions = new Map<LayoutRevisionId, LayoutRevision>();
  readonly releases = new Map<ThemeReleaseId, ThemeRelease>();
  readonly activations = new Map<ThemeActivationId, SiteThemeActivation>();
  async createTheme(theme: Theme): Promise<void> {
    assertDomain(![...this.themes.values()].some((value) => value.workspaceId === theme.workspaceId && value.key === theme.key), "THEME_KEY_EXISTS", "Theme key already exists", 409);
    this.themes.set(theme.id, structuredClone(theme));
  }
  async getTheme(id: ThemeId): Promise<Theme | null> { return clone(this.themes.get(id)); }
  async listThemes(workspaceId: WorkspaceId): Promise<Theme[]> { return [...this.themes.values()].filter((value) => value.workspaceId === workspaceId).map((value) => structuredClone(value)); }
  async createTokenRevision(revision: DesignTokenRevision): Promise<void> { this.tokenRevisions.set(revision.id, structuredClone(revision)); }
  async getTokenRevision(id: DesignTokenRevisionId): Promise<DesignTokenRevision | null> { return clone(this.tokenRevisions.get(id)); }
  async countTokenRevisions(themeId: ThemeId): Promise<number> { return [...this.tokenRevisions.values()].filter((value) => value.themeId === themeId).length; }
  async createLayoutRevision(revision: LayoutRevision): Promise<void> { this.layoutRevisions.set(revision.id, structuredClone(revision)); }
  async getLayoutRevision(id: LayoutRevisionId): Promise<LayoutRevision | null> { return clone(this.layoutRevisions.get(id)); }
  async countLayoutRevisions(themeId: ThemeId): Promise<number> { return [...this.layoutRevisions.values()].filter((value) => value.themeId === themeId).length; }
  async createRelease(release: ThemeRelease): Promise<void> {
    assertDomain(![...this.releases.values()].some((value) => value.themeId === release.themeId && value.version === release.version), "THEME_VERSION_EXISTS", "Theme release version already exists", 409);
    this.releases.set(release.id, structuredClone(release));
  }
  async getRelease(id: ThemeReleaseId): Promise<ThemeRelease | null> { return clone(this.releases.get(id)); }
  async listReleases(themeId: ThemeId): Promise<ThemeRelease[]> { return [...this.releases.values()].filter((value) => value.themeId === themeId).sort((a,b)=>b.createdAt-a.createdAt).map((value)=>structuredClone(value)); }
  async activate(activation: SiteThemeActivation): Promise<void> {
    for (const value of this.activations.values()) if (value.siteId === activation.siteId && value.deactivatedAt === null) value.deactivatedAt = activation.activatedAt;
    this.activations.set(activation.id, structuredClone(activation));
  }
  async getActiveActivation(siteId: SiteId): Promise<SiteThemeActivation | null> {
    const active = [...this.activations.values()].filter((value) => value.siteId === siteId && value.deactivatedAt === null).sort((a,b)=>b.activatedAt-a.activatedAt)[0];
    return active ? structuredClone(active) : null;
  }
}

export const BUILTIN_RELEASE_ID = "builtin-default@1";
export function builtinTheme(): ResolvedThemePresentation {
  const now = 0;
  const theme: Theme = { id: asThemeId("theme_builtin"), workspaceId: "ws_builtin" as WorkspaceId, key: "builtin-default", name: "baserEdge Default", description: "Built-in safe fallback theme", state: "active", createdBy: "prn_system" as PrincipalId, createdAt: now };
  const tokens: DesignTokens = { colorBackground:"#ffffff", colorSurface:"#ffffff", colorText:"#1d1d1f", colorMuted:"#5f6368", colorAccent:"#145a35", colorBorder:"#d9e0db", fontFamily:'system-ui,-apple-system,"Noto Sans JP",sans-serif', baseFontSize:16, lineHeight:1.7, contentMaxWidth:1152, spacingScale:1, radius:10 };
  const tokenRevision: DesignTokenRevision = { id:asDesignTokenRevisionId("dtok_builtin"),themeId:theme.id,revisionNumber:1,name:"Default",tokens,contentHash:"builtin",createdBy:theme.createdBy,createdAt:now };
  const layout: LayoutDefinition = { header:"simple",navigation:"none",footer:"simple",showSiteName:true,footerText:"",mainClass:"bc-page" };
  const layoutRevision: LayoutRevision = { id:asLayoutRevisionId("layout_builtin"),themeId:theme.id,revisionNumber:1,name:"Default",layout,contentHash:"builtin",createdBy:theme.createdBy,createdAt:now };
  const release: ThemeRelease = { id:asThemeReleaseId(BUILTIN_RELEASE_ID),themeId:theme.id,version:"1.0.0",designTokenRevisionId:tokenRevision.id,layoutRevisionId:layoutRevision.id,manifest:{rendererApiVersion:1,variant:"light",supportedContentTypes:["*"],cssText:"",source:{kind:"native"}},releaseHash:"builtin",state:"ready",createdBy:theme.createdBy,createdAt:now };
  return { theme, release, tokenRevision, layoutRevision, activation:null, builtin:true };
}

export function compileThemeCss(presentation: ResolvedThemePresentation): string {
  const t = presentation.tokenRevision.tokens;
  return `:root{--bc-bg:${t.colorBackground};--bc-surface:${t.colorSurface};--bc-text:${t.colorText};--bc-muted:${t.colorMuted};--bc-accent:${t.colorAccent};--bc-border:${t.colorBorder};--bc-font:${t.fontFamily};--bc-font-size:${t.baseFontSize}px;--bc-line-height:${t.lineHeight};--bc-content-max:${t.contentMaxWidth}px;--bc-space-scale:${t.spacingScale};--bc-radius:${t.radius}px;color-scheme:${presentation.release.manifest.variant === "dark" ? "dark" : presentation.release.manifest.variant === "auto" ? "light dark" : "light"}}\n${presentation.release.manifest.cssText}`;
}

function validateTokens(input: DesignTokens): DesignTokens {
  const colors = [input.colorBackground,input.colorSurface,input.colorText,input.colorMuted,input.colorAccent,input.colorBorder];
  assertDomain(colors.every(isSafeColor), "INVALID_THEME_COLOR", "Theme colors must use hexadecimal CSS notation", 422);
  assertDomain(typeof input.fontFamily === "string" && input.fontFamily.length > 0 && input.fontFamily.length <= 240 && !/[{};<>]/.test(input.fontFamily), "INVALID_THEME_FONT", "Font family is invalid", 422);
  assertRange(input.baseFontSize, 12, 24, "baseFontSize"); assertRange(input.lineHeight, 1, 2.4, "lineHeight"); assertRange(input.contentMaxWidth, 480, 1920, "contentMaxWidth"); assertRange(input.spacingScale, .5, 2, "spacingScale"); assertRange(input.radius, 0, 40, "radius");
  return structuredClone(input);
}
function validateLayout(input: LayoutDefinition): LayoutDefinition {
  assertDomain(["none","simple","brand"].includes(input.header), "INVALID_THEME_LAYOUT", "Invalid header layout", 422);
  assertDomain(["none","top"].includes(input.navigation), "INVALID_THEME_LAYOUT", "Invalid navigation layout", 422);
  assertDomain(["none","simple"].includes(input.footer), "INVALID_THEME_LAYOUT", "Invalid footer layout", 422);
  assertDomain(typeof input.showSiteName === "boolean", "INVALID_THEME_LAYOUT", "showSiteName must be boolean", 422);
  const footerText = optionalText(input.footerText, 240); const mainClass = validateClassName(input.mainClass || "bc-page");
  return { ...input, footerText, mainClass };
}
function validateManifest(input: ThemeReleaseManifest): ThemeReleaseManifest {
  assertDomain(input.rendererApiVersion === 1, "UNSUPPORTED_THEME_RENDERER", "Unsupported theme renderer API version", 422);
  assertDomain(["light","dark","auto"].includes(input.variant), "INVALID_THEME_VARIANT", "Invalid theme variant", 422);
  assertDomain(Array.isArray(input.supportedContentTypes) && input.supportedContentTypes.length > 0 && input.supportedContentTypes.length <= 64, "INVALID_THEME_CONTENT_TYPES", "supportedContentTypes is invalid", 422);
  const cssText = input.cssText ?? "";
  assertDomain(cssText.length <= 65536, "THEME_CSS_TOO_LARGE", "Theme CSS exceeds 64 KiB", 413);
  const lowered = cssText.toLowerCase();
  assertDomain(!lowered.includes("@import") && !lowered.includes("expression(") && !lowered.includes("javascript:") && !lowered.includes("</style") && !/url\s*\(\s*["']?https?:/i.test(cssText), "UNSAFE_THEME_CSS", "Theme CSS contains a forbidden external or executable construct", 422);
  assertDomain(["native","basercms-migration","emdash-derived"].includes(input.source.kind), "INVALID_THEME_SOURCE", "Invalid theme source", 422);
  return { rendererApiVersion:1, variant:input.variant, supportedContentTypes:[...new Set(input.supportedContentTypes.map((value)=>requiredText(String(value),80)))], cssText, source:{kind:input.source.kind,...(input.source.reference?{reference:optionalText(input.source.reference,500)}:{})} };
}
function normalizeKey(value: string): string { const key=value.trim().toLowerCase(); assertDomain(/^[a-z][a-z0-9-]{1,62}$/.test(key),"INVALID_THEME_KEY","Theme key must be lowercase ASCII with hyphens",422); return key; }
function validateVersion(value:string):string{const version=value.trim();assertDomain(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version),"INVALID_THEME_VERSION","Theme release version must be semantic versioning",422);return version;}
function validateClassName(value:string):string{assertDomain(/^[a-zA-Z][a-zA-Z0-9 _-]{0,120}$/.test(value),"INVALID_THEME_CLASS","Theme layout class is invalid",422);return value;}
function requiredText(value:string,max:number):string{const result=value.trim();assertDomain(result.length>0&&result.length<=max,"INVALID_TEXT","Required text is empty or too long",422);return result;}
function optionalText(value:string,max:number):string{const result=value.trim();assertDomain(result.length<=max,"TEXT_TOO_LONG","Text is too long",422);return result;}
function assertRange(value:number,min:number,max:number,name:string):void{assertDomain(Number.isFinite(value)&&value>=min&&value<=max,"INVALID_THEME_TOKEN",`${name} is outside the allowed range`,422);}
function isSafeColor(value:string):boolean{return typeof value==="string"&&/^#[0-9a-fA-F]{3,8}$/.test(value);}
function clone<T>(value:T|undefined):T|null{return value===undefined?null:structuredClone(value);}
