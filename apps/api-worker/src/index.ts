import {
  DomainError,
  asApprovalId,
  asCollectionId,
  asTaxonomyId,
  asTermId,
  asAssetId,
  asPreviewSessionId,
  asUploadSessionId,
  asContentItemId,
  asContentNodeId,
  asPrincipalId,
  asRevisionId,
  asSiteId,
  asCustomContentId,
  asCustomEntryApprovalId,
  asCustomEntryId,
  asCustomEntryRevisionId,
  asCustomFieldId,
  asCustomTableId,
  asMailFormId,
  asMailSubmissionId,
  asThemeId,
  asThemeReleaseId,
  asDesignTokenRevisionId,
  asLayoutRevisionId,
  asPluginId,
  asPluginReleaseId,
  asPluginActivationId,
  asWorkspaceId,
  type ActorContext,
  type PrincipalType,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import {
  CmsService,
  MemoryCmsStore,
  actor,
} from "@baser-edge/content-kernel";
import {
  createEmptyDocument,
  type BlockNode,
  type BlockOperation,
} from "@baser-edge/structured-document";
import { AgentOperations } from "@baser-edge/agent-tools";
import {
  D1AssetMetadataStore,
  D1BlogStore,
  D1CustomContentStore,
  D1MailFormStore,
  D1CmsStore,
  D1PreviewStore,
  D1ThemeStore,
  D1PluginStore,
  WorkersForPlatformsPluginRuntime,
  type DispatchNamespaceLike,
  R2AssetObjectStore,
  type D1DatabaseLike,
  type R2BucketLike,
} from "@baser-edge/cloudflare-adapters";
import {
  AssetService,
  MemoryAssetMetadataStore,
  MemoryAssetObjectStore,
} from "@baser-edge/asset-kernel";
import { MemoryPreviewStore, PreviewService } from "@baser-edge/preview-kernel";
import { BlogService, MemoryBlogStore } from "@baser-edge/blog-kernel";
import { CustomContentService, MemoryCustomContentStore, type CustomFieldType } from "@baser-edge/custom-content-kernel";
import {
  CloudflareEmailSender, MailFormService, MemoryMailFormStore, TurnstileBotVerifier, UnavailableBotVerifier,
  type CloudflareEmailBindingLike, type PrivacyClass,
} from "@baser-edge/mail-form-kernel";
import { MemoryThemeStore, ThemeService, type DesignTokens, type LayoutDefinition, type ThemeReleaseManifest } from "@baser-edge/theme-kernel";
import {
  MemoryPluginStore, MemoryTrustedPluginRuntime, PluginService, UnavailablePluginRuntime,
  type PluginBundleDescriptor, type PluginCapability, type PluginManifest, type PluginTrust,
} from "@baser-edge/plugin-kernel";
import {
  AuthService,
  SimpleWebAuthnGateway,
  TestWebAuthnGateway,
  memoryAuthStore,
} from "@baser-edge/auth-kernel";
import { D1AuthStore } from "@baser-edge/cloudflare-adapters";
import {
  createPrincipalLookup,
  handleAuthRoute,
  instantLoginEnabled,
  isProductionEnv,
  parseInstantOwnerHint,
  resolveActorContext,
} from "./auth-routes.js";
import { resolveConsoleCapabilities } from "./platform-capabilities.js";
import { createCorsContext, applyCors } from "./http/cors.js";
import { buildInitialHomepageBlocks } from "./initial-homepage-blocks.js";

export interface Env {
  DB?: D1DatabaseLike;
  R2?: R2BucketLike;
  /** Wrangler static assets binding for admin console (`apps/admin-web/dist`). */
  STATIC_ASSETS?: { fetch(request: Request): Promise<Response> };
  ASSET_UPLOAD_SECRET?: string;
  PREVIEW_SECRET?: string;
  PUBLIC_BASE_URL?: string;
  PREVIEW_BASE_URL?: string;
  MAIL_FORM_SECRET?: string;
  MAIL_PRIVACY_SALT?: string;
  TURNSTILE_SECRET?: string;
  EMAIL?: CloudflareEmailBindingLike;
  PLUGIN_DISPATCHER?: DispatchNamespaceLike;
  PLUGIN_OUTBOUND_POLICY_ENFORCED?: string;
  LOCAL_DEV_LOGIN_HINT?: string;
  BASER_INSTANT_LOGIN?: string;
  BASER_INSTANT_OWNER_HINT?: string;
  BASER_ENV?: string;
  BASER_ALLOW_BOOTSTRAP?: string;
  BASER_BOOTSTRAP_SECRET?: string;
  BASER_AUTH_RP_ID?: string;
  BASER_AUTH_ORIGIN?: string;
  BASER_WEBAUTHN_GATEWAY?: string;
  CF_ACCESS_REQUIRED?: string;
}

const memoryStore = new MemoryCmsStore();
const memoryCms = new CmsService(memoryStore);
const memoryAssetMetadata = new MemoryAssetMetadataStore();
const memoryAssetObjects = new MemoryAssetObjectStore();
const memoryPreviewStore = new MemoryPreviewStore();
const memoryBlogStore = new MemoryBlogStore();
const memoryCustomContentStore = new MemoryCustomContentStore();
const memoryMailFormStore = new MemoryMailFormStore();
const memoryThemeStore = new MemoryThemeStore();
const memoryPluginStore = new MemoryPluginStore();
const memoryTrustedPluginRuntime = new MemoryTrustedPluginRuntime();

export interface ApiWorkerOptions {
  resolveAssets?: (env: Env, cms: CmsService) => AssetService;
  resolvePreviews?: (env: Env, cms: CmsService) => PreviewService;
  resolveBlog?: (env: Env, cms: CmsService) => BlogService;
  resolveCustomContent?: (env: Env, cms: CmsService) => CustomContentService;
  resolveMailForms?: (env: Env, cms: CmsService, customContent: CustomContentService) => MailFormService;
  resolveThemes?: (env: Env, cms: CmsService) => ThemeService;
  resolvePlugins?: (env: Env, cms: CmsService) => PluginService;
  resolveAuth?: (env: Env, cms: CmsService) => AuthService;
}

/** Map public /console/* URL to wrangler assets path (dist root is not under /console). */
export function mapConsoleUrlToAssetPath(pathname: string): string | null {
  if (pathname === "/console") return "/";
  if (!pathname.startsWith("/console/")) return null;
  const rest = pathname.slice("/console".length);
  if (!rest || rest === "/") return "/";
  return rest;
}

async function tryServeConsole(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!env.STATIC_ASSETS) return null;
  const assetPath = mapConsoleUrlToAssetPath(url.pathname);
  if (!assetPath) return null;
  const assetUrl = new URL(assetPath, url.origin);
  return env.STATIC_ASSETS.fetch(new Request(assetUrl, request));
}

export async function createInitialHomepage(
  cms: CmsService,
  input: { siteId: string; ownerPrincipalId: string; siteName: string },
): Promise<void> {
  const siteId = asSiteId(input.siteId);
  const owner = actor(asPrincipalId(input.ownerPrincipalId), "human");
  const tree = await cms.listContentTree(owner, siteId);
  if (tree.some((entry) => entry.snapshot.route.path === "/home")) return;

  const document = createEmptyDocument();
  const body = document.root.slots.body ??= [];
  body.push(...buildInitialHomepageBlocks(input.siteName));
  const page = await cms.createPage(owner, {
    siteId,
    parentId: null,
    slug: "home",
    title: "ホーム",
    document,
  });
  const approval = await cms.requestApproval(owner, {
    contentItemId: page.item.id,
    revisionId: page.workingRevision!.id,
  });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved", comment: "初期サイトの作成" });
  await cms.publish(owner, {
    contentItemId: page.item.id,
    revisionId: page.workingRevision!.id,
    approvalId: approval.id,
  });
}

async function ensureTrialHomepage(cms: CmsService, env: Env): Promise<void> {
  if (!instantLoginEnabled(env)) return;
  const hint = parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT);
  if (!hint) return;
  await createInitialHomepage(cms, {
    siteId: hint.siteId,
    ownerPrincipalId: hint.ownerPrincipalId,
    siteName: hint.siteName ?? "マイサイト",
  });
}

export function createApiWorker(resolveCms: (env: Env) => CmsService = defaultResolver, options: ApiWorkerOptions = {}) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const corsContext = createCorsContext(request, env.BASER_AUTH_ORIGIN);
      const withCors = (response: Response) => applyCors(response, corsContext);
      const json = (value: unknown, status = 200) =>
        withCors(new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } }));
      const errorResponse = (error: unknown): Response => {
        if (error instanceof DomainError) {
          return json({ error: { code: error.code, message: error.message, details: error.details ?? {} } }, error.status);
        }
        console.error(error);
        return json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
      };

      if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/") {
        return Response.redirect(`${url.origin}/console/`, 302);
      }
      const cms = resolveCms(env);
      if (request.method === "GET" && (url.pathname === "/console" || url.pathname === "/console/")) {
        await ensureTrialHomepage(cms, env);
      }
      const consoleResponse = await tryServeConsole(request, env);
      if (consoleResponse) return consoleResponse;
      const auth = options.resolveAuth?.(env, cms) ?? createAuthService(env, cms);
      cms.attachSecurityHooks({ assertStepUp: (actor, input) => auth.assertStepUp(actor, input) });
      const assets = options.resolveAssets?.(env, cms) ?? createAssetService(env, cms);
      const previews = options.resolvePreviews?.(env, cms) ?? createPreviewService(env, cms);
      const blog = options.resolveBlog?.(env, cms) ?? createBlogService(env, cms);
      const customContent = options.resolveCustomContent?.(env, cms) ?? createCustomContentService(env, cms);
      const mailForms = options.resolveMailForms?.(env, cms, customContent) ?? createMailFormService(env, cms, customContent);
      const themes = options.resolveThemes?.(env, cms) ?? createThemeService(env, cms);
      const plugins = options.resolvePlugins?.(env, cms) ?? createPluginService(env, cms);
      cms.attachLifecycleHooks(plugins);
      try {
        if (request.method === "GET" && url.pathname === "/health") {
          return json({ ok: true, service: "baser-edge-api", version: "0.9.0" });
        }
        if (url.pathname === "/v1/console/capabilities") {
          if (request.method !== "GET") {
            throw new DomainError("METHOD_NOT_ALLOWED", "Only GET is supported", 405);
          }
          return json(resolveConsoleCapabilities(env));
        }
        if (request.method === "GET" && url.pathname === "/v1/dev/local-login-hint") {
          if (!env.LOCAL_DEV_LOGIN_HINT) {
            return json({
              error: {
                code: "LOCAL_STACK_REQUIRED",
                message: "ローカルログイン情報がありません。ルートで npm run dev:stack を起動し、ログに表示された管理画面 URL（/console/）を開いてください。",
              },
            }, 503);
          }
          return json(JSON.parse(env.LOCAL_DEV_LOGIN_HINT));
        }
        const authResponse = await handleAuthRoute(request, url, env, auth, readJson);
        if (authResponse) return withCors(authResponse);
        if (request.method === "POST" && url.pathname === "/v1/bootstrap/ready") {
          assertBootstrapAllowed(request, env);
          return json({ ready: true });
        }
        if (request.method === "POST" && url.pathname === "/v1/bootstrap") {
          assertBootstrapAllowed(request, env);
          const body = await readJson(request);
          try {
            const boot = await cms.bootstrap({
              workspaceName: stringField(body, "workspaceName"),
              siteName: stringField(body, "siteName"),
              hostname: stringField(body, "hostname"),
              ownerName: stringField(body, "ownerName"),
              ...(typeof body.locale === "string" ? { locale: body.locale } : {}),
            });
            if (env.BASER_BOOTSTRAP_SECRET) {
              await createInitialHomepage(cms, {
                siteId: boot.siteId,
                ownerPrincipalId: boot.ownerPrincipalId,
                siteName: stringField(body, "siteName"),
              });
            }
            return json(boot, 201);
          } catch (error) {
            if (error instanceof DomainError) throw error;
            const cause = error instanceof Error ? error.message : String(error);
            throw new DomainError("BOOTSTRAP_FAILED", "Bootstrap failed", 500, {
              cause: cause.slice(0, 500),
            });
          }
        }

        const uploadMatch = url.pathname.match(/^\/v1\/assets\/uploads\/([^/]+)$/);
        if (request.method === "PUT" && uploadMatch?.[1]) {
          const token = url.searchParams.get("token");
          if (!token) invalid("token is required");
          if (!request.body) invalid("upload body is required");
          const contentLengthHeader = request.headers.get("content-length");
          const contentLength = contentLengthHeader === null ? undefined : Number(contentLengthHeader);
          const uploaded = await assets.uploadWithToken({
            sessionId: asUploadSessionId(uploadMatch[1]),
            token,
            mediaType: request.headers.get("content-type") ?? "application/octet-stream",
            ...(contentLength !== undefined && Number.isFinite(contentLength) ? { contentLength } : {}),
            body: request.body,
          });
          return json(uploaded, 201);
        }

        const context = await resolveActorContext(request, env, auth);

        if (request.method === "POST" && url.pathname === "/v1/plugins") {
          const body = await readJson(request);
          return json(await plugins.createPlugin(context, {
            workspaceId: workspaceIdBodyField(body, "workspaceId"), key:stringField(body,"key"), name:stringField(body,"name"),
            trust: pluginTrust(body.trust), ...(typeof body.description === "string" ? {description:body.description}:{}),
          }),201);
        }
        const workspacePluginsMatch=url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugins$/);
        if(request.method==="GET"&&workspacePluginsMatch?.[1])return json(await plugins.listPlugins(context,workspacePathId(workspacePluginsMatch[1])));
        const pluginReleasesMatch=url.pathname.match(/^\/v1\/plugins\/([^/]+)\/releases$/);
        if(request.method==="POST"&&pluginReleasesMatch?.[1]){const body=await readJson(request);return json(await plugins.createRelease(context,{pluginId:asPluginId(pluginReleasesMatch[1]),version:stringField(body,"version"),manifest:pluginManifestField(body.manifest),bundle:pluginBundleField(body.bundle)}),201);}
        if(request.method==="GET"&&pluginReleasesMatch?.[1])return json(await plugins.listReleases(context,asPluginId(pluginReleasesMatch[1])));
        const pluginInvocationsMatch=url.pathname.match(/^\/v1\/plugin-releases\/([^/]+)\/invocations$/);
        if(request.method==="GET"&&pluginInvocationsMatch?.[1])return json(await plugins.listInvocations(context,asPluginReleaseId(pluginInvocationsMatch[1])));
        const pluginActivationsMatch=url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugin-activations$/);
        if(request.method==="POST"&&pluginActivationsMatch?.[1]){const body=await readJson(request);return json(await plugins.activate(context,{workspaceId:workspacePathId(pluginActivationsMatch[1]),siteId:typeof body.siteId==="string"?asSiteId(parsePrefixedId("site",body.siteId,"siteId")):null,pluginReleaseId:asPluginReleaseId(stringField(body,"pluginReleaseId")),grantedCapabilities:pluginCapabilitiesField(body.grantedCapabilities),allowedHosts:typeof body.allowedHosts==="undefined"?[]:stringArray(body.allowedHosts,"allowedHosts")}),201);}
        if(request.method==="GET"&&pluginActivationsMatch?.[1]){const siteId=url.searchParams.get("siteId");return json(await plugins.listActivations(context,workspacePathId(pluginActivationsMatch[1]),...(siteId?[asSiteId(parsePrefixedId("site",siteId,"siteId"))]:[])));}
        const pluginActivationMatch=url.pathname.match(/^\/v1\/plugin-activations\/([^/]+)$/);
        if(request.method==="DELETE"&&pluginActivationMatch?.[1]){await plugins.deactivate(context,asPluginActivationId(pluginActivationMatch[1]));return new Response(null,{status:204});}
        const pluginAdminMatch=url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugin-admin-extensions$/);
        if(request.method==="GET"&&pluginAdminMatch?.[1])return json(await plugins.listAdminExtensions(context,workspacePathId(pluginAdminMatch[1]),url.searchParams.get("siteId")?asSiteId(parsePrefixedId("site",url.searchParams.get("siteId")!,"siteId")):null));
        const pluginRouteMatch=url.pathname.match(/^\/v1\/plugin-routes\/([^/]+)(\/.*)?$/);
        if((request.method==="GET"||request.method==="POST")&&pluginRouteMatch?.[1]){
          const workspaceId=workspaceQueryParam(url.searchParams);
          const query=Object.fromEntries([...url.searchParams.entries()].filter(([key])=>key!=="workspaceId"&&key!=="siteId"));
          const result=await plugins.invokeRoute(context,{workspaceId,siteId:optionalSiteQueryParam(url.searchParams),pluginKey:pluginRouteMatch[1],method:request.method,path:pluginRouteMatch[2]??"/",query,headers:Object.fromEntries(request.headers),body:request.method==="POST"?await readOptionalPluginRouteBody(request):null});
          return withCors(new Response(result.body,{status:result.status,headers:result.headers}));
        }

        if (request.method === "POST" && url.pathname === "/v1/principals") {
          const body = await readJson(request);
          return json(await cms.createPrincipal(context, {
            workspaceId: workspaceIdBodyField(body, "workspaceId"),
            type: principalType(body.type),
            displayName: stringField(body, "displayName"),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/grants") {
          const body = await readJson(request);
          const scope = optionalCapabilityScopeField(body, "scope");
          return json(await cms.grantCapability(context, {
            principalId: asPrincipalId(stringField(body, "principalId")),
            capability: stringField(body, "capability"),
            ...(scope ? { scope } : {}),
            ...(typeof body.validUntil === "number" ? { validUntil: body.validUntil } : {}),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/themes") {
          const body = await readJson(request);
          return json(await themes.createTheme(context, { workspaceId: workspaceIdBodyField(body, "workspaceId"), key: stringField(body, "key"), name: stringField(body, "name"), ...(typeof body.description === "string" ? { description: body.description } : {}) }), 201);
        }
        const workspaceThemesMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/themes$/);
        if (request.method === "GET" && workspaceThemesMatch?.[1]) return json(await themes.listThemes(context, workspacePathId(workspaceThemesMatch[1])));
        const tokenRevisionMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/token-revisions$/);
        if (request.method === "POST" && tokenRevisionMatch?.[1]) { const body=await readJson(request); return json(await themes.createTokenRevision(context,{themeId:asThemeId(tokenRevisionMatch[1]),name:stringField(body,"name"),tokens:designTokensField(body.tokens)}),201); }
        const layoutRevisionMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/layout-revisions$/);
        if (request.method === "POST" && layoutRevisionMatch?.[1]) { const body=await readJson(request); return json(await themes.createLayoutRevision(context,{themeId:asThemeId(layoutRevisionMatch[1]),name:stringField(body,"name"),layout:layoutField(body.layout)}),201); }
        const themeReleaseMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/releases$/);
        if (request.method === "POST" && themeReleaseMatch?.[1]) { const body=await readJson(request); return json(await themes.createRelease(context,{themeId:asThemeId(themeReleaseMatch[1]),version:stringField(body,"version"),designTokenRevisionId:asDesignTokenRevisionId(stringField(body,"designTokenRevisionId")),layoutRevisionId:asLayoutRevisionId(stringField(body,"layoutRevisionId")),manifest:themeManifestField(body.manifest)}),201); }
        if (request.method === "GET" && themeReleaseMatch?.[1]) return json(await themes.listReleases(context,asThemeId(themeReleaseMatch[1])));
        const siteThemeMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/theme$/);
        if (request.method === "GET" && siteThemeMatch?.[1]) return json(await themes.getActive(context, sitePathId(siteThemeMatch[1])));
        const themeActivationMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/theme-activations$/);
        if (request.method === "POST" && themeActivationMatch?.[1]) { const body=await readJson(request); return json(await themes.activate(context,{siteId:sitePathId(themeActivationMatch[1]),themeReleaseId:asThemeReleaseId(stringField(body,"themeReleaseId"))}),201); }

        if (request.method === "POST" && url.pathname === "/v1/delegations") {
          const body = await readJson(request);
          return json(await cms.createDelegation(context, {
            humanPrincipalId: asPrincipalId(stringField(body, "humanPrincipalId")),
            agentPrincipalId: asPrincipalId(stringField(body, "agentPrincipalId")),
            capabilities: stringArray(body.capabilities, "capabilities"),
            expiresAt: numberField(body, "expiresAt"),
            ...(isRecord(body.scope) ? { scope: body.scope } : {}),
            ...(isRisk(body.maximumRisk) ? { maximumRisk: body.maximumRisk } : {}),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/pages") {
          const body = await readJson(request);
          return json(await cms.createPage(context, {
            siteId: siteIdBodyField(body, "siteId"),
            parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
            document: documentField(body.document),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/folders") {
          const body = await readJson(request);
          return json(await cms.createFolder(context, {
            siteId: siteIdBodyField(body, "siteId"),
            parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/aliases") {
          const body = await readJson(request);
          return json(await cms.createAlias(context, {
            siteId: siteIdBodyField(body, "siteId"),
            parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
            targetContentItemId: asContentItemId(stringField(body, "targetContentItemId")),
          }), 201);
        }

        if (request.method === "POST" && url.pathname === "/v1/blogs") {
          const body = await readJson(request);
          return json(await blog.createBlog(context, {
            siteId: siteIdBodyField(body, "siteId"),
            parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
            document: documentField(body.document),
            ...("pageSize" in body ? { pageSize: boundedIntField(body, "pageSize", { defaultValue: 10, min: 1, max: 100 }) } : {}),
            ...("feedSize" in body ? { feedSize: boundedIntField(body, "feedSize", { defaultValue: 20, min: 1, max: 100 }) } : {}),
            ...(body.sortDirection === "asc" || body.sortDirection === "desc" ? { sortDirection: body.sortDirection } : {}),
          }), 201);
        }

        const articleCreateMatch = url.pathname.match(/^\/v1\/blogs\/([^/]+)\/articles$/);
        if (request.method === "POST" && articleCreateMatch?.[1]) {
          const body = await readJson(request);
          return json(await blog.createArticle(context, {
            collectionId: asCollectionId(articleCreateMatch[1]),
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
            document: documentField(body.document),
            ...(typeof body.postedAt === "number" ? { postedAt: body.postedAt } : {}),
            ...(Array.isArray(body.termIds) ? { termIds: body.termIds.map((value) => asTermId(String(value))) } : {}),
          }), 201);
        }
        if (request.method === "GET" && articleCreateMatch?.[1]) {
          const termIds = url.searchParams.getAll("termId").map(asTermId);
          return json(await blog.listPublishedArticles(asCollectionId(articleCreateMatch[1]), {
            ...(url.searchParams.has("limit") ? { limit: optionalQueryInt(url.searchParams.get("limit"), "limit", 100) } : {}),
            ...(url.searchParams.has("offset") ? { offset: optionalQueryInt(url.searchParams.get("offset"), "offset", 1_000_000) } : {}),
            ...(termIds.length ? { termIds } : {}),
          }));
        }

        const taxonomyListMatch = url.pathname.match(/^\/v1\/blogs\/([^/]+)\/taxonomies$/);
        if (request.method === "GET" && taxonomyListMatch?.[1]) return json(await blog.listTaxonomies(asCollectionId(taxonomyListMatch[1])));
        if (request.method === "POST" && taxonomyListMatch?.[1]) {
          const body = await readJson(request);
          const kind = body.kind === "category" || body.kind === "tag" ? body.kind : invalid("kind must be category or tag");
          return json(await blog.createTaxonomy(context, {
            collectionId: asCollectionId(taxonomyListMatch[1]),
            key: stringField(body, "key"),
            title: stringField(body, "title"),
            kind,
            ...(typeof body.hierarchical === "boolean" ? { hierarchical: body.hierarchical } : {}),
          }), 201);
        }

        const termCreateMatch = url.pathname.match(/^\/v1\/taxonomies\/([^/]+)\/terms$/);
        if (request.method === "POST" && termCreateMatch?.[1]) {
          const body = await readJson(request);
          return json(await blog.createTerm(context, {
            taxonomyId: asTaxonomyId(termCreateMatch[1]),
            slug: stringField(body, "slug"),
            title: stringField(body, "title"),
            ...(body.parentId === null ? { parentId: null } : typeof body.parentId === "string" ? { parentId: asTermId(body.parentId) } : {}),
          }), 201);
        }

        if (request.method === "POST" && url.pathname === "/v1/custom-fields") {
          const body = await readJson(request);
          return json(await customContent.createField(context, {
            workspaceId: workspaceIdBodyField(body, "workspaceId"),
            key: stringField(body, "key"),
            name: stringField(body, "name"),
            type: customFieldType(body.type),
            ...(typeof body.description === "string" ? { description: body.description } : {}),
            ...(Array.isArray(body.options) ? { options: body.options.map((item) => {
              if (!isRecord(item)) invalid("options entries must be objects");
              return { value: stringField(item, "value"), label: stringField(item, "label") };
            }) } : {}),
          }), 201);
        }
        if (request.method === "GET" && url.pathname === "/v1/custom-fields") {
          const workspaceId = workspaceQueryParam(url.searchParams);
          return json(await customContent.listFields(workspaceId));
        }
        if (request.method === "POST" && url.pathname === "/v1/custom-tables") {
          const body = await readJson(request);
          const kind = body.kind === "content" || body.kind === "master" ? body.kind : invalid("kind must be content or master");
          return json(await customContent.createTable(context, {
            workspaceId: workspaceIdBodyField(body, "workspaceId"),
            key: stringField(body, "key"), name: stringField(body, "name"), kind,
            ...(typeof body.hierarchical === "boolean" ? { hierarchical: body.hierarchical } : {}),
            ...(body.displayFieldKey === null || typeof body.displayFieldKey === "string" ? { displayFieldKey: body.displayFieldKey } : {}),
          }), 201);
        }
        if (request.method === "GET" && url.pathname === "/v1/custom-tables") {
          const workspaceId = workspaceQueryParam(url.searchParams);
          return json(await customContent.listTables(workspaceId));
        }
        const customTableSchemaMatch = url.pathname.match(/^\/v1\/custom-tables\/([^/]+)\/schema$/);
        if (request.method === "GET" && customTableSchemaMatch?.[1]) return json(await customContent.getTableSchema(asCustomTableId(customTableSchemaMatch[1])));
        const customTableFieldsMatch = url.pathname.match(/^\/v1\/custom-tables\/([^/]+)\/fields$/);
        if (request.method === "POST" && customTableFieldsMatch?.[1]) {
          const body = await readJson(request);
          return json(await customContent.attachField(context, {
            tableId: asCustomTableId(customTableFieldsMatch[1]), fieldId: asCustomFieldId(stringField(body, "fieldId")),
            ...(typeof body.required === "boolean" ? { required: body.required } : {}),
            ...(typeof body.searchable === "boolean" ? { searchable: body.searchable } : {}),
            ...(typeof body.unique === "boolean" ? { unique: body.unique } : {}),
            ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
            ...(body.labelOverride === null || typeof body.labelOverride === "string" ? { labelOverride: body.labelOverride } : {}),
          }), 201);
        }
        if (request.method === "POST" && url.pathname === "/v1/custom-contents") {
          const body = await readJson(request);
          return json(await customContent.createCustomContent(context, {
            siteId: siteIdBodyField(body, "siteId"), parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"), title: stringField(body, "title"), tableId: asCustomTableId(stringField(body, "tableId")),
            ...(isRecord(body.document) ? { document: documentField(body.document) } : {}),
            ...(typeof body.listCount === "number" ? { listCount: body.listCount } : {}),
            ...(typeof body.listOrderFieldKey === "string" ? { listOrderFieldKey: body.listOrderFieldKey } : {}),
            ...(body.listDirection === "asc" || body.listDirection === "desc" ? { listDirection: body.listDirection } : {}),
            ...(typeof body.templateKey === "string" ? { templateKey: body.templateKey } : {}),
          }), 201);
        }
        const customEntriesMatch = url.pathname.match(/^\/v1\/custom-contents\/([^/]+)\/entries$/);
        if (request.method === "POST" && customEntriesMatch?.[1]) {
          const body = await readJson(request);
          return json(await customContent.createEntry(context, {
            customContentId: asCustomContentId(customEntriesMatch[1]), values: recordField(body, "values"),
            ...(body.slug === null || typeof body.slug === "string" ? { slug: body.slug } : {}),
            ...(body.parentEntryId === null || typeof body.parentEntryId === "string" ? { parentEntryId: body.parentEntryId ? asCustomEntryId(body.parentEntryId) : null } : {}),
          }), 201);
        }
        if (request.method === "GET" && customEntriesMatch?.[1]) return json(await customContent.listEntries(context, asCustomContentId(customEntriesMatch[1])));
        const customEntryMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)$/);
        if (request.method === "GET" && customEntryMatch?.[1]) return json(await customContent.getEntry(context, asCustomEntryId(customEntryMatch[1])));
        const customEntryRevisionMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/revisions$/);
        if (request.method === "POST" && customEntryRevisionMatch?.[1]) {
          const body = await readJson(request);
          return json(await customContent.reviseEntry(context, { entryId: asCustomEntryId(customEntryRevisionMatch[1]), baseRevisionId: asCustomEntryRevisionId(stringField(body, "baseRevisionId")), expectedLockVersion: numberField(body, "expectedLockVersion"), values: recordField(body, "values"), changeSummary: stringField(body, "changeSummary") }), 201);
        }
        const customEntryApprovalMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/approvals$/);
        if (request.method === "POST" && customEntryApprovalMatch?.[1]) {
          const body = await readJson(request); return json(await customContent.requestApproval(context, { entryId: asCustomEntryId(customEntryApprovalMatch[1]), revisionId: asCustomEntryRevisionId(stringField(body, "revisionId")) }), 201);
        }
        const customApprovalDecisionMatch = url.pathname.match(/^\/v1\/custom-entry-approvals\/([^/]+)\/decide$/);
        if (request.method === "POST" && customApprovalDecisionMatch?.[1]) {
          const body = await readJson(request); const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : invalid("decision must be approved or rejected");
          return json(await customContent.decideApproval(context, { approvalId: asCustomEntryApprovalId(customApprovalDecisionMatch[1]), decision, ...(typeof body.comment === "string" ? { comment: body.comment } : {}) }));
        }
        const customEntryPublishMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/publish$/);
        if (request.method === "POST" && customEntryPublishMatch?.[1]) {
          const body = await readJson(request); return json(await customContent.publishEntry(context, { entryId: asCustomEntryId(customEntryPublishMatch[1]), revisionId: asCustomEntryRevisionId(stringField(body, "revisionId")), approvalId: asCustomEntryApprovalId(stringField(body, "approvalId")) }));
        }
        const customEntryUnpublishMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/unpublish$/);
        if (request.method === "POST" && customEntryUnpublishMatch?.[1]) {
          return json(await customContent.unpublishEntry(context, { entryId: asCustomEntryId(customEntryUnpublishMatch[1]) }));
        }

        const classifyMatch = url.pathname.match(/^\/v1\/articles\/([^/]+)\/revisions\/([^/]+)\/terms$/);
        if (request.method === "PUT" && classifyMatch?.[1] && classifyMatch[2]) {
          const body = await readJson(request);
          const termIds = stringArray(body.termIds, "termIds").map(asTermId);
          await blog.classifyRevision(context, asContentItemId(classifyMatch[1]), asRevisionId(classifyMatch[2]), termIds);
          return json({ ok: true });
        }

        const treeMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/content-tree$/);
        if (request.method === "GET" && treeMatch?.[1]) {
          return json(await cms.listContentTree(context, sitePathId(treeMatch[1])));
        }
        const blogsListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/blogs$/);
        if (request.method === "GET" && blogsListMatch?.[1]) {
          const siteId = sitePathId(blogsListMatch[1]);
          await cms.listContentTree(context, siteId);
          const collections = await blog.listCollections(siteId);
          return json(await Promise.all(collections.map(async (collection) => ({ collection, snapshot: await cms.getContent(context, collection.contentItemId) }))));
        }
        const customContentsListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/custom-contents$/);
        if (request.method === "GET" && customContentsListMatch?.[1]) {
          const siteId = sitePathId(customContentsListMatch[1]);
          await cms.listContentTree(context, siteId);
          const definitions = await customContent.listCustomContents(siteId);
          return json(await Promise.all(definitions.map(async (definition) => ({
            definition,
            snapshot: await cms.getContent(context, definition.contentItemId),
            schema: await customContent.getTableSchema(definition.tableId),
          }))));
        }
        const trashListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/trash$/);
        if (request.method === "GET" && trashListMatch?.[1]) {
          return json(await cms.listTrash(context, sitePathId(trashListMatch[1])));
        }
        const pendingApprovalsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/pending-approvals$/);
        if (request.method === "GET" && pendingApprovalsMatch?.[1]) {
          return json(await cms.listPendingApprovals(context, sitePathId(pendingApprovalsMatch[1])));
        }
        const pendingCustomApprovalsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/pending-custom-entry-approvals$/);
        if (request.method === "GET" && pendingCustomApprovalsMatch?.[1]) {
          return json(await customContent.listPendingApprovals(context, sitePathId(pendingCustomApprovalsMatch[1])));
        }
        const approvalInboxMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/approval-inbox$/);
        if (request.method === "GET" && approvalInboxMatch?.[1]) {
          const siteId = sitePathId(approvalInboxMatch[1]);
          return json({
            content: await cms.listContentApprovalInbox(context, siteId),
            customEntries: await customContent.listPendingApprovals(context, siteId),
          });
        }

        if (request.method === "POST" && url.pathname === "/v1/mail-forms") {
          const body = await readJson(request);
          return json(await mailForms.createMailForm(context, {
            siteId: siteIdBodyField(body, "siteId"),
            parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
            slug: stringField(body, "slug"), title: stringField(body, "title"),
            tableId: asCustomTableId(stringField(body, "tableId")),
            recipientEmails: stringArray(body.recipientEmails, "recipientEmails"),
            senderAddress: stringField(body, "senderAddress"),
            ...(typeof body.subjectTemplate === "string" ? { subjectTemplate: body.subjectTemplate } : {}),
            ...(typeof body.autoReplyEnabled === "boolean" ? { autoReplyEnabled: body.autoReplyEnabled } : {}),
            ...(typeof body.autoReplyEmailFieldKey === "string" || body.autoReplyEmailFieldKey === null ? { autoReplyEmailFieldKey: body.autoReplyEmailFieldKey as string | null } : {}),
            ...(typeof body.autoReplySubject === "string" ? { autoReplySubject: body.autoReplySubject } : {}),
            ...(typeof body.confirmationTtlSeconds === "number" ? { confirmationTtlSeconds: body.confirmationTtlSeconds } : {}),
            ...(typeof body.retentionDays === "number" ? { retentionDays: body.retentionDays } : {}),
            ...(typeof body.turnstileRequired === "boolean" ? { turnstileRequired: body.turnstileRequired } : {}),
            ...(isRecord(body.document) ? { document: documentField(body.document) } : {}),
            ...(Array.isArray(body.fieldPolicies) ? { fieldPolicies: body.fieldPolicies.map((value) => {
              if (!isRecord(value)) invalid("fieldPolicies entries must be objects");
              return { fieldId: asCustomFieldId(stringField(value, "fieldId")), ...(privacyClass(value.privacyClass) ? { privacyClass: privacyClass(value.privacyClass)! } : {}), ...(typeof value.includeInOwnerNotification === "boolean" ? { includeInOwnerNotification: value.includeInOwnerNotification } : {}), ...(typeof value.includeInAutoReply === "boolean" ? { includeInAutoReply: value.includeInAutoReply } : {}) };
            }) } : {}),
          }), 201);
        }
        const siteMailFormsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/mail-forms$/);
        if (request.method === "GET" && siteMailFormsMatch?.[1]) { const siteId=sitePathId(siteMailFormsMatch[1]);await cms.listContentTree(context,siteId);return json(await mailForms.listForms(siteId)); }
        const mailSubmissionsMatch = url.pathname.match(/^\/v1\/mail-forms\/([^/]+)\/submissions$/);
        if (request.method === "GET" && mailSubmissionsMatch?.[1]) return json(await mailForms.listSubmissions(context, asMailFormId(mailSubmissionsMatch[1])));
        const mailSubmissionMatch = url.pathname.match(/^\/v1\/mail-submissions\/([^/]+)$/);
        if (request.method === "GET" && mailSubmissionMatch?.[1]) return json(await mailForms.getSubmission(context, asMailSubmissionId(mailSubmissionMatch[1]), { includeSensitive: url.searchParams.get("includeSensitive") === "true" }));
        const mailPurgeMatch = url.pathname.match(/^\/v1\/mail-submissions\/([^/]+)\/purge$/);
        if (request.method === "POST" && mailPurgeMatch?.[1]) return json(await mailForms.purgeSubmission(context, asMailSubmissionId(mailPurgeMatch[1])));
        if (request.method === "POST" && url.pathname === "/v1/mail-notifications/deliver") {
          const body = await readJson(request);
          const limit = boundedIntField(body, "limit", { defaultValue: 20, min: 1, max: 100 });
          return json(await mailForms.deliverPending(context, limit));
        }

        const articleMetaMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/article-meta$/);
        if (articleMetaMatch?.[1]) {
          const contentItemId = asContentItemId(articleMetaMatch[1]);
          if (request.method === "GET") {
            const { article } = await blog.getArticleMetadata(context, contentItemId);
            return json({ postedAt: article.postedAt, createdAt: article.createdAt });
          }
          if (request.method === "PATCH") {
            const body = await readJson(request);
            const updated = await blog.updateArticlePostedAt(context, {
              contentItemId,
              postedAt: numberField(body, "postedAt"),
            });
            return json({ postedAt: updated.postedAt, createdAt: updated.createdAt });
          }
        }

        const contentMatch = url.pathname.match(/^\/v1\/content\/([^/]+)$/);
        if (request.method === "GET" && contentMatch?.[1]) {
          return json(await cms.getContent(context, asContentItemId(contentMatch[1])));
        }

        const revisionsMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/revisions$/);
        if (request.method === "POST" && revisionsMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.commitRevision(context, {
            contentItemId: asContentItemId(revisionsMatch[1]),
            baseRevisionId: asRevisionId(stringField(body, "baseRevisionId")),
            expectedLockVersion: numberField(body, "expectedLockVersion"),
            fields: recordField(body, "fields"),
            document: documentField(body.document),
            changeSummary: stringField(body, "changeSummary"),
          }), 201);
        }

        const proposalMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/agent-proposals$/);
        if (request.method === "POST" && proposalMatch?.[1]) {
          const body = await readJson(request);
          const tools = new AgentOperations(cms);
          return json(await tools.proposeDocumentChange(context, {
            contentItemId: asContentItemId(proposalMatch[1]),
            baseRevisionId: asRevisionId(stringField(body, "baseRevisionId")),
            expectedLockVersion: numberField(body, "expectedLockVersion"),
            operations: blockOperationsField(body.operations),
            instructionSummary: stringField(body, "instructionSummary"),
            modelProvider: stringField(body, "modelProvider"),
            modelName: stringField(body, "modelName"),
          }), 201);
        }

        const approvalsMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/approvals$/);
        if (request.method === "POST" && approvalsMatch?.[1]) {
          const body = await readJson(request);
          if ("riskLevel" in body && body.riskLevel !== undefined && !isRisk(body.riskLevel)) {
            invalid("riskLevel must be a valid risk level");
          }
          return json(await cms.requestApproval(context, {
            contentItemId: asContentItemId(approvalsMatch[1]),
            revisionId: asRevisionId(stringField(body, "revisionId")),
            ...(isRisk(body.riskLevel) ? { riskLevel: body.riskLevel } : {}),
          }), 201);
        }

        const decideMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/decide$/);
        if (request.method === "POST" && decideMatch?.[1]) {
          const body = await readJson(request);
          const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : invalid("decision must be approved or rejected");
          return json(await cms.decideApproval(context, {
            approvalId: asApprovalId(decideMatch[1]),
            decision,
            ...(typeof body.comment === "string" ? { comment: body.comment } : {}),
          }));
        }

        const publishMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/publish$/);
        if (request.method === "POST" && publishMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.publish(context, {
            contentItemId: asContentItemId(publishMatch[1]),
            revisionId: asRevisionId(stringField(body, "revisionId")),
            approvalId: asApprovalId(stringField(body, "approvalId")),
          }));
        }

        const unpublishMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/unpublish$/);
        if (request.method === "POST" && unpublishMatch?.[1]) {
          return json(await cms.unpublish(context, { contentItemId: asContentItemId(unpublishMatch[1]) }));
        }

        const reorderMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/reorder$/);
        if (request.method === "POST" && reorderMatch?.[1]) {
          const body = await readJson(request);
          const contentItemId = asContentItemId(reorderMatch[1]);
          const snapshot = await cms.getContent(context, contentItemId);
          return json(await cms.reorderContent(context, {
            contentItemId,
            targetParentId: body.targetParentId === null
              ? null
              : typeof body.targetParentId === "string"
                ? asContentNodeId(body.targetParentId)
                : snapshot.node.parentId,
            insertAfterContentItemId: body.insertAfterContentItemId === null
              ? null
              : typeof body.insertAfterContentItemId === "string"
                ? asContentItemId(body.insertAfterContentItemId)
                : null,
            expectedTreeVersion: numberField(body, "expectedTreeVersion"),
          }));
        }

        const moveImpactMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/move-impact$/);
        if (request.method === "POST" && moveImpactMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.analyzeRelocation(context, {
            contentItemId: asContentItemId(moveImpactMatch[1]),
            targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
            newSlug: stringField(body, "newSlug"),
          }));
        }

        const moveMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/move$/);
        if (request.method === "POST" && moveMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.relocateContent(context, {
            contentItemId: asContentItemId(moveMatch[1]),
            targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
            newSlug: stringField(body, "newSlug"),
            expectedTreeVersion: numberField(body, "expectedTreeVersion"),
          }));
        }

        const copyMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/copy$/);
        if (request.method === "POST" && copyMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.copyContent(context, {
            contentItemId: asContentItemId(copyMatch[1]),
            targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
            newSlug: stringField(body, "newSlug"),
            expectedTreeVersion: numberField(body, "expectedTreeVersion"),
            ...(typeof body.includeDescendants === "boolean" ? { includeDescendants: body.includeDescendants } : {}),
          }), 201);
        }

        const trashMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/trash$/);
        if (request.method === "POST" && trashMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.trashContent(context, {
            contentItemId: asContentItemId(trashMatch[1]),
            expectedTreeVersion: numberField(body, "expectedTreeVersion"),
          }));
        }

        const restoreMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/restore$/);
        if (request.method === "POST" && restoreMatch?.[1]) {
          const body = await readJson(request);
          return json(await cms.restoreContent(context, {
            contentItemId: asContentItemId(restoreMatch[1]),
            expectedTreeVersion: numberField(body, "expectedTreeVersion"),
            ...(body.targetParentId === null ? { targetParentId: null } : typeof body.targetParentId === "string" ? { targetParentId: asContentNodeId(body.targetParentId) } : {}),
            ...(typeof body.newSlug === "string" ? { newSlug: body.newSlug } : {}),
          }));
        }

        if (request.method === "POST" && url.pathname === "/v1/assets/upload-sessions") {
          const body = await readJson(request);
          return json(await assets.createUploadSession(context, {
            workspaceId: workspaceIdBodyField(body, "workspaceId"),
            filename: stringField(body, "filename"),
            mediaType: stringField(body, "mediaType"),
            uploadBaseUrl: typeof body.uploadBaseUrl === "string" ? body.uploadBaseUrl : env.PUBLIC_BASE_URL ?? url.origin,
            ...(typeof body.maximumBytes === "number" ? { maximumBytes: body.maximumBytes } : {}),
            ...(typeof body.expiresInSeconds === "number" ? { expiresInSeconds: body.expiresInSeconds } : {}),
          }), 201);
        }
        if (request.method === "GET" && url.pathname === "/v1/assets") {
          const workspaceId = workspaceQueryParam(url.searchParams);
          return json(await assets.listAssets(context, workspaceId));
        }
        const assetMatch = url.pathname.match(/^\/v1\/assets\/([^/]+)$/);
        if (request.method === "GET" && assetMatch?.[1]) return json(await assets.getAsset(context, asAssetId(assetMatch[1])));
        if (request.method === "DELETE" && assetMatch?.[1]) return json(await assets.deleteAsset(context, asAssetId(assetMatch[1])));

        const previewCreateMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/previews$/);
        if (request.method === "POST" && previewCreateMatch?.[1]) {
          const body = await readJson(request);
          const contentItemId = asContentItemId(previewCreateMatch[1]);
          const snapshot = await cms.getContent(context, contentItemId);
          const themeRelease = typeof body.themeRelease === "string" ? body.themeRelease : (await themes.resolveActive(snapshot.item.siteId)).release.id;
          return json(await previews.create(context, {
            contentItemId,
            revisionId: asRevisionId(stringField(body, "revisionId")),
            previewBaseUrl: typeof body.previewBaseUrl === "string" ? body.previewBaseUrl : env.PREVIEW_BASE_URL ?? env.PUBLIC_BASE_URL ?? url.origin,
            ...(typeof body.expiresInSeconds === "number" ? { expiresInSeconds: body.expiresInSeconds } : {}),
            themeRelease,
          }), 201);
        }
        const previewRevokeMatch = url.pathname.match(/^\/v1\/previews\/([^/]+)\/revoke$/);
        if (request.method === "POST" && previewRevokeMatch?.[1]) return json(await previews.revoke(context, asPreviewSessionId(previewRevokeMatch[1])));

        if (request.method === "GET" && url.pathname === "/v1/audit") {
          const workspaceId = workspaceQueryParam(url.searchParams);
          return json(await cms.listAudit(context, workspaceId));
        }

        return json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}

function createAuthService(env: Env, cms: CmsService): AuthService {
  const store = env.DB ? new D1AuthStore(env.DB as never) : memoryAuthStore;
  const origin = env.BASER_AUTH_ORIGIN ?? "http://localhost:8787";
  const rpId = env.BASER_AUTH_RP_ID ?? new URL(origin).hostname;
  const webauthn = env.BASER_WEBAUTHN_GATEWAY === "simple"
    ? new SimpleWebAuthnGateway({ rpId, rpName: "baser-edge", origin })
    : new TestWebAuthnGateway();
  return new AuthService({
    store,
    principals: createPrincipalLookup(cms),
    webauthn,
    secureCookies: isProductionEnv(env),
    ...(env.BASER_BOOTSTRAP_SECRET ? { bootstrapSecret: env.BASER_BOOTSTRAP_SECRET } : {}),
  });
}

function assertBootstrapAllowed(request: Request, env: Env): void {
  if (isProductionEnv(env) && env.BASER_ALLOW_BOOTSTRAP !== "true") {
    throw new DomainError("BOOTSTRAP_DISABLED", "Bootstrap is disabled in production", 403);
  }
  if (
    env.BASER_BOOTSTRAP_SECRET
    && request.headers.get("x-baser-bootstrap-secret") !== env.BASER_BOOTSTRAP_SECRET
  ) {
    throw new DomainError("BOOTSTRAP_SECRET_INVALID", "Bootstrap secret is invalid", 403);
  }
}

function securityGateway(cms: CmsService) {
  return {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms),
  };
}

function createAssetService(env: Env, cms: CmsService): AssetService {
  return new AssetService({
    metadata: env.DB ? new D1AssetMetadataStore(env.DB) : memoryAssetMetadata,
    objects: env.R2 ? new R2AssetObjectStore(env.R2) : memoryAssetObjects,
    security: securityGateway(cms),
    signingSecret: env.ASSET_UPLOAD_SECRET ?? "development-upload-secret-change-me",
    usageInspector: { listPublishedReferences: cms.store.listPublishedAssetReferences.bind(cms.store) },
  });
}

function createPreviewService(env: Env, cms: CmsService): PreviewService {
  return new PreviewService({
    store: env.DB ? new D1PreviewStore(env.DB) : memoryPreviewStore,
    cms,
    security: securityGateway(cms),
    signingSecret: env.PREVIEW_SECRET ?? "development-preview-secret-change-me",
  });
}

function createBlogService(env: Env, cms: CmsService): BlogService {
  return new BlogService(env.DB ? new D1BlogStore(env.DB) : memoryBlogStore, cms);
}
function createCustomContentService(env: Env, cms: CmsService): CustomContentService {
  return new CustomContentService(env.DB ? new D1CustomContentStore(env.DB) : memoryCustomContentStore, cms);
}
function createThemeService(env: Env, cms: CmsService): ThemeService {
  return new ThemeService({ store: env.DB ? new D1ThemeStore(env.DB) : memoryThemeStore, cms, security: securityGateway(cms) });
}
function createPluginService(env: Env, cms: CmsService): PluginService {
  return new PluginService({
    store: env.DB ? new D1PluginStore(env.DB) : memoryPluginStore, cms, security: securityGateway(cms),
    trustedRuntime: memoryTrustedPluginRuntime,
    sandboxRuntime: env.PLUGIN_DISPATCHER ? new WorkersForPlatformsPluginRuntime({dispatcher:env.PLUGIN_DISPATCHER,networkPolicyEnforced:env.PLUGIN_OUTBOUND_POLICY_ENFORCED==="true"}) : new UnavailablePluginRuntime("PLUGIN_DISPATCHER binding is not configured"),
  });
}
function createMailFormService(env: Env, cms: CmsService, customContent: CustomContentService): MailFormService {
  return new MailFormService({
    store: env.DB ? new D1MailFormStore(env.DB) : memoryMailFormStore, cms, customContent,
    signingSecret: env.MAIL_FORM_SECRET ?? "development-mail-form-secret-change-me",
    ...(env.MAIL_PRIVACY_SALT ? { privacySalt: env.MAIL_PRIVACY_SALT } : {}),
    botVerifier: env.TURNSTILE_SECRET ? new TurnstileBotVerifier(env.TURNSTILE_SECRET) : new UnavailableBotVerifier(),
    ...(env.EMAIL ? { sender: new CloudflareEmailSender(env.EMAIL) } : {}),
  });
}

function defaultResolver(env: Env): CmsService {
  return env.DB ? new CmsService(new D1CmsStore(env.DB)) : memoryCms;
}

async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("INVALID_JSON", "Request body is not valid JSON", 400);
  }
}

async function readOptionalPluginRouteBody(request: Request): Promise<Record<string, unknown> | null> {
  const value = await readOptionalJson(request);
  if (value === null) return null;
  if (!isRecord(value)) invalid("request body must be a JSON object");
  return value;
}

const PREFixed_ID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePrefixedId(prefix: string, value: string, name: string): string {
  const head = `${prefix}_`;
  if (!value.startsWith(head)) invalid(`${name} must start with ${head}`);
  const suffix = value.slice(head.length);
  if (!PREFixed_ID_UUID.test(suffix)) invalid(`${name} must be a valid id`);
  return value;
}

function workspaceQueryParam(searchParams: URLSearchParams, name = "workspaceId"): WorkspaceId {
  const raw = searchParams.get(name);
  if (!raw?.trim()) invalid(`${name} is required`);
  return asWorkspaceId(parsePrefixedId("ws", raw.trim(), name));
}

function optionalSiteQueryParam(searchParams: URLSearchParams): SiteId | null {
  const raw = searchParams.get("siteId");
  if (!raw?.trim()) return null;
  return asSiteId(parsePrefixedId("site", raw.trim(), "siteId"));
}

function workspacePathId(segment: string): WorkspaceId {
  return asWorkspaceId(parsePrefixedId("ws", segment, "workspaceId"));
}

function sitePathId(segment: string): SiteId {
  return asSiteId(parsePrefixedId("site", segment, "siteId"));
}

function siteIdBodyField(body: Record<string, unknown>, key: string): SiteId {
  return asSiteId(parsePrefixedId("site", stringField(body, key), key));
}

function workspaceIdBodyField(body: Record<string, unknown>, key: string): WorkspaceId {
  return asWorkspaceId(parsePrefixedId("ws", stringField(body, key), key));
}

function blockOperationsField(value: unknown): BlockOperation[] {
  if (!Array.isArray(value)) invalid("operations must be an array");
  return value.map((entry, index) => parseBlockOperation(entry, index));
}

function parseBlockOperation(value: unknown, index: number): BlockOperation {
  if (!isRecord(value)) invalid(`operations[${index}] must be an object`);
  const kind = value.kind;
  if (kind === "updateProps") {
    return {
      kind,
      blockId: stringField(value as Record<string, unknown>, "blockId"),
      patch: recordField(value as Record<string, unknown>, "patch"),
    };
  }
  if (kind === "remove") {
    return { kind, blockId: stringField(value as Record<string, unknown>, "blockId") };
  }
  if (kind === "insert") {
    const record = value as Record<string, unknown>;
    const slot = stringField(record, "slot");
    const indexValue = record.index;
    if (typeof indexValue !== "number" || !Number.isInteger(indexValue) || indexValue < 0) {
      invalid(`operations[${index}].index must be a non-negative integer`);
    }
    return {
      kind: "insert",
      parentId: stringField(record, "parentId"),
      slot,
      index: indexValue,
      block: blockNodeField(record.block, `operations[${index}].block`),
    };
  }
  if (kind === "move") {
    const record = value as Record<string, unknown>;
    const indexValue = record.index;
    if (typeof indexValue !== "number" || !Number.isInteger(indexValue) || indexValue < 0) {
      invalid(`operations[${index}].index must be a non-negative integer`);
    }
    return {
      kind: "move",
      blockId: stringField(record, "blockId"),
      parentId: stringField(record, "parentId"),
      slot: stringField(record, "slot"),
      index: indexValue,
    };
  }
  if (kind === "duplicate") {
    const record = value as Record<string, unknown>;
    const indexValue = record.index;
    if (typeof indexValue !== "number" || !Number.isInteger(indexValue) || indexValue < 0) {
      invalid(`operations[${index}].index must be a non-negative integer`);
    }
    return {
      kind: "duplicate",
      blockId: stringField(record, "blockId"),
      parentId: stringField(record, "parentId"),
      slot: stringField(record, "slot"),
      index: indexValue,
    };
  }
  invalid(`operations[${index}].kind is invalid`);
}

function blockNodeField(value: unknown, path: string): BlockNode {
  if (!isRecord(value)) invalid(`${path} must be an object`);
  const id = typeof value.id === "string" && value.id.length > 0 ? value.id : invalid(`${path}.id must be a non-empty string`);
  const type = typeof value.type === "string" && value.type.length > 0 ? value.type : invalid(`${path}.type must be a non-empty string`);
  const componentVersion = typeof value.componentVersion === "number" && Number.isInteger(value.componentVersion) && value.componentVersion >= 1
    ? value.componentVersion
    : invalid(`${path}.componentVersion must be a positive integer`);
  const props = isRecord(value.props) ? value.props : invalid(`${path}.props must be an object`);
  const slotsRaw = isRecord(value.slots) ? value.slots : invalid(`${path}.slots must be an object`);
  const slots: Record<string, BlockNode[]> = {};
  for (const [slotName, children] of Object.entries(slotsRaw)) {
    if (!Array.isArray(children)) invalid(`${path}.slots.${slotName} must be an array`);
    slots[slotName] = children.map((child, childIndex) => blockNodeField(child, `${path}.slots.${slotName}[${childIndex}]`));
  }
  return { id, type, componentVersion, props, slots };
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (!isRecord(value)) invalid("JSON body must be an object");
    return value;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("INVALID_JSON", "Request body is not valid JSON", 400);
  }
}

function documentField(value: unknown) {
  if (!isRecord(value) || value.formatVersion !== 1 || !isRecord(value.root)) invalid("document must be a StructuredDocument");
  return value as never;
}
function recordField(body: Record<string, unknown>, key: string): Record<string, unknown> { const value = body[key]; return isRecord(value) ? value : invalid(`${key} must be an object`); }
function stringField(body: Record<string, unknown>, key: string): string { const value = body[key]; return typeof value === "string" && value.length > 0 ? value : invalid(`${key} must be a non-empty string`); }
function numberField(body: Record<string, unknown>, key: string): number { const value = body[key]; return typeof value === "number" && Number.isFinite(value) ? value : invalid(`${key} must be a number`); }
function boundedIntField(
  body: Record<string, unknown>,
  key: string,
  bounds: { defaultValue: number; min: number; max: number },
): number {
  if (!(key in body)) return bounds.defaultValue;
  const value = numberField(body, key);
  if (!Number.isInteger(value)) invalid(`${key} must be an integer`);
  if (value < bounds.min || value > bounds.max) invalid(`${key} must be between ${bounds.min} and ${bounds.max}`);
  return value;
}
const CAPABILITY_SCOPE_KEYS = new Set(["workspaceId", "siteId", "contentType", "pathPrefix", "maximumRisk"]);
function optionalCapabilityScopeField(body: Record<string, unknown>, key: string) {
  if (!(key in body)) return undefined;
  const raw = body[key];
  if (!isRecord(raw)) invalid(`${key} must be an object`);
  for (const entryKey of Object.keys(raw)) {
    if (!CAPABILITY_SCOPE_KEYS.has(entryKey)) invalid(`scope.${entryKey} is not allowed`);
  }
  const scope: {
    workspaceId?: WorkspaceId;
    siteId?: SiteId;
    contentType?: string;
    pathPrefix?: string;
    maximumRisk?: "low" | "medium" | "high" | "critical";
  } = {};
  if (raw.workspaceId !== undefined) scope.workspaceId = workspaceIdBodyField({ workspaceId: raw.workspaceId }, "workspaceId");
  if (raw.siteId !== undefined) scope.siteId = asSiteId(parsePrefixedId("site", stringField({ siteId: raw.siteId }, "siteId"), "siteId"));
  if (raw.contentType !== undefined) scope.contentType = stringField({ contentType: raw.contentType }, "contentType");
  if (raw.pathPrefix !== undefined) scope.pathPrefix = stringField({ pathPrefix: raw.pathPrefix }, "pathPrefix");
  if (raw.maximumRisk !== undefined) {
    if (!isRisk(raw.maximumRisk)) invalid("scope.maximumRisk must be a valid risk level");
    scope.maximumRisk = raw.maximumRisk;
  }
  return scope;
}
function optionalQueryInt(raw: string | null, name: string, max: number): number {
  if (raw === null || raw.trim() === "") invalid(`${name} is required`);
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) invalid(`${name} must be an integer`);
  if (value < 0) invalid(`${name} must be >= 0`);
  if (value > max) invalid(`${name} must be <= ${max}`);
  return value;
}
function stringArray(value: unknown, key: string): string[] { return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : invalid(`${key} must be an array of strings`); }
function customFieldType(value: unknown): CustomFieldType {
  const values = ["text","textarea","integer","decimal","boolean","date","datetime","email","tel","select","multiselect","asset","richtext"];
  return typeof value === "string" && values.includes(value) ? value as CustomFieldType : invalid("type must be a supported custom field type");
}
function designTokensField(value: unknown): DesignTokens { if(!isRecord(value)) invalid("tokens must be an object"); return value as unknown as DesignTokens; }
function layoutField(value: unknown): LayoutDefinition { if(!isRecord(value)) invalid("layout must be an object"); return value as unknown as LayoutDefinition; }
function themeManifestField(value: unknown): ThemeReleaseManifest { if(!isRecord(value)) invalid("manifest must be an object"); return value as unknown as ThemeReleaseManifest; }
function pluginManifestField(value: unknown): PluginManifest { if(!isRecord(value)) invalid("manifest must be an object"); return value as unknown as PluginManifest; }
function pluginBundleField(value: unknown): PluginBundleDescriptor { if(!isRecord(value)) invalid("bundle must be an object"); return value as unknown as PluginBundleDescriptor; }
function pluginTrust(value: unknown): PluginTrust { return value === "trusted" || value === "sandboxed" ? value : invalid("trust must be trusted or sandboxed"); }
function pluginCapabilitiesField(value: unknown): PluginCapability[] { return stringArray(value,"grantedCapabilities") as PluginCapability[]; }
function privacyClass(value: unknown): PrivacyClass | null { return value === "non-personal" || value === "personal" || value === "sensitive" ? value : null; }
function principalType(value: unknown): PrincipalType { return isPrincipalType(value) ? value : invalid("type must be a valid principal type"); }
function isPrincipalType(value: unknown): value is PrincipalType { return value === "human" || value === "agent" || value === "service" || value === "external-client"; }
function isRisk(value: unknown): value is "low" | "medium" | "high" | "critical" { return value === "low" || value === "medium" || value === "high" || value === "critical"; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function invalid(message: string): never { throw new DomainError("INVALID_REQUEST", message, 422); }

export default createApiWorker();
