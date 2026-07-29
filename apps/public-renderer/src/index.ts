import { asAssetId, asMailConfirmationId, asSiteId, DomainError } from "@baser-edge/core-types";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";
import {
  D1BlogStore,
  D1CustomContentStore,
  D1MailFormStore,
  D1CmsStore,
  D1PreviewStore,
  D1ThemeStore,
  resolveAssetBindings,
  type D1DatabaseLike,
  type R2BucketLike,
} from "@baser-edge/cloudflare-adapters";
import { AssetService } from "@baser-edge/asset-kernel";
import { MemoryPreviewStore, PreviewService } from "@baser-edge/preview-kernel";
import { renderPage, renderShell } from "@baser-edge/renderer";
import { BlogService, MemoryBlogStore, type PublishedArticle } from "@baser-edge/blog-kernel";
import { CustomContentService, MemoryCustomContentStore, type CustomEntrySnapshot, type CustomTableSchema } from "@baser-edge/custom-content-kernel";
import { MailFormService, MemoryMailFormStore, TurnstileBotVerifier, UnavailableBotVerifier, type MailFormDefinition } from "@baser-edge/mail-form-kernel";
import { MemoryThemeStore, ThemeService, type ResolvedThemePresentation } from "@baser-edge/theme-kernel";
import { injectAdminViewBanner, shouldShowPublishedAdminBanner } from "./admin-view-banner.js";
import { buildPublicPageSeo } from "./page-seo.js";
import { renderRobotsTxt, renderSitemapXml } from "./public-discovery.js";
import {
  createPublicAssetUrlResolver,
  serveBuiltinAssetByRawId,
  serveBuiltinAssetRequest,
} from "./builtin-assets.js";
import { isAssetDeliverableOnPublicSite } from "./public-asset-delivery.js";

const defaultPublicAssetUrl = createPublicAssetUrlResolver("/assets");

export interface Env {
  DB?: D1DatabaseLike;
  R2?: R2BucketLike;
  SITE_ID?: string;
  ASSET_BASE_URL?: string;
  PREVIEW_SECRET?: string;
  ASSET_UPLOAD_SECRET?: string;
  MAIL_FORM_SECRET?: string;
  MAIL_PRIVACY_SALT?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  BASER_ASSET_STORAGE?: string;
}

export interface PublicWorkerOptions {
  resolvePreview?: (env: Env, cms: CmsService) => PreviewService;
  resolveAssets?: (env: Env, cms: CmsService) => AssetService;
  resolveBlog?: (env: Env, cms: CmsService) => BlogService;
  resolveCustomContent?: (env: Env, cms: CmsService) => CustomContentService;
  resolveMailForms?: (env: Env, cms: CmsService, customContent: CustomContentService) => MailFormService;
  resolveThemes?: (env: Env, cms: CmsService) => ThemeService;
  cache?: PublicResponseCache | null;
}

export interface PublicResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface PublicExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const memoryCms = new CmsService(new MemoryCmsStore());
const memoryPreviews = new MemoryPreviewStore();
const memoryBlog = new MemoryBlogStore();
const memoryCustomContent = new MemoryCustomContentStore();
const memoryMailForms = new MemoryMailFormStore();
const memoryThemes = new MemoryThemeStore();
const noopSecurity = {
  authorize: async () => {},
  success: async () => {},
};

function createPublicWorkerCore(
  resolveCms: (env: Env) => CmsService = (env) => env.DB ? new CmsService(new D1CmsStore(env.DB)) : memoryCms,
  options: PublicWorkerOptions = {},
) {
  return {
    async fetch(request: Request, env: Env, context?: PublicExecutionContext): Promise<Response> {
      try {
        if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
        const url = new URL(request.url);
        const builtinAssetResponse = serveBuiltinAssetRequest(request, url.pathname);
        if (builtinAssetResponse) return builtinAssetResponse;
        const cms = resolveCms(env);
        const assets = options.resolveAssets?.(env, cms) ?? createAssetService(env);
        const blog = options.resolveBlog?.(env, cms) ?? createBlogService(env, cms);
        const customContent = options.resolveCustomContent?.(env, cms) ?? createCustomContentService(env, cms);
        const mailForms = options.resolveMailForms?.(env, cms, customContent) ?? createMailFormService(env, cms, customContent);
        const themes = options.resolveThemes?.(env, cms) ?? createThemeService(env, cms);

        const assetMatch = url.pathname.match(/^\/assets\/([^/]+)$/);
        if (assetMatch?.[1]) {
          const builtinById = serveBuiltinAssetByRawId(request, assetMatch[1]);
          if (builtinById) return builtinById;
          const previews = options.resolvePreview?.(env, cms) ?? (env.PREVIEW_SECRET || env.DB ? createPreviewService(env, cms) : undefined);
          return serveAsset(request, assets, cms, previews, env, assetMatch[1]);
        }

        const previewMatch = url.pathname.match(/^\/_preview\/(.+)$/);
        if (previewMatch?.[1]) {
          const previews = options.resolvePreview?.(env, cms) ?? createPreviewService(env, cms);
          const resolved = await previews.resolve(
            decodeURIComponent(previewMatch[1]),
            context ? {
              deferTouch: (promise) => context.waitUntil(promise.catch((error) => {
                console.warn("preview access timestamp update failed", error);
              })),
            } : {},
          );
          const title = typeof resolved.revision.fields.title === "string" ? resolved.revision.fields.title : "";
          const [theme, previewSite] = await Promise.all([
            themes.resolveRelease(resolved.session.themeRelease, resolved.session.siteId),
            resolved.site ? Promise.resolve(resolved.site) : cms.store.getSite(resolved.session.siteId),
          ]);
          let html = renderPage(resolved.revision.document, {
            assetUrl: createPublicAssetUrlResolver("/assets"),
            contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`,
          }, {
            title,
            revision: resolved.revision,
            preview: true,
            theme,
            siteName: previewSite?.name ?? "",
            lang: previewSite?.locale ?? "ja",
            seo: buildPublicPageSeo({
              origin: url.origin,
              path: resolved.snapshot.route.path,
              title,
              siteName: previewSite?.name ?? "",
              locale: previewSite?.locale ?? "ja",
              document: resolved.revision.document,
              revision: resolved.revision,
              preview: true,
            }),
          });
          html = injectAdminViewBanner(html, "draft", resolved.revision.id);
          return new Response(request.method === "HEAD" ? null : html, {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "private, no-store",
              "x-robots-tag": "noindex, nofollow, noarchive",
              "referrer-policy": "no-referrer",
              "x-baser-preview-session-id": resolved.session.id,
              "x-baser-content-id": resolved.snapshot.item.id,
              "x-baser-revision-id": resolved.revision.id,
              "content-security-policy": "default-src 'self'; img-src 'self' data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com; style-src 'unsafe-inline'",
            },
          });
        }

        if (!env.SITE_ID) return new Response("SITE_ID is not configured", { status: 503 });
        const siteId = asSiteId(env.SITE_ID);

        if (url.pathname === "/robots.txt") {
          const body = renderRobotsTxt(url.origin);
          return new Response(request.method === "HEAD" ? null : body, {
            headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
          });
        }
        if (url.pathname === "/sitemap.xml") {
          const xml = await renderSitemapXml(cms, siteId, url.origin);
          return new Response(request.method === "HEAD" ? null : xml, {
            headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=1800" },
          });
        }
        const mailActionMatch = url.pathname.match(/^(.*)\/(confirm|submit)\/?$/);
        if (request.method === "POST" && mailActionMatch) {
          const rootPath = mailActionMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "mail-form" || !root.snapshot.publishedRevision) return new Response("Not Found", { status: 404 });
          const form = await mailForms.getFormByContentItem(root.snapshot.item.id);
          if (!form) return new Response("Not Found", { status: 404 });
          if (mailActionMatch[2] === "confirm") {
            const schema = await mailForms.getSchema(form.id);
            const data = await readMailFormBody(request);
            const values: Record<string, unknown> = {};
            for (const { definition } of schema.fields) {
              if (definition.type === "multiselect") values[definition.key] = data.getAll(definition.key).map(String);
              else if (definition.type === "boolean") values[definition.key] = data.get(definition.key) === "true" || data.get(definition.key) === "1" || data.get(definition.key) === "on";
              else { const value=data.get(definition.key); if(value!==null) values[definition.key]=String(value); }
            }
            const prepared = await mailForms.prepareConfirmation({ mailFormId: form.id, values, turnstileToken: String(data.get("cf-turnstile-response") ?? ""), ...(request.headers.get("cf-connecting-ip") ? { remoteIp: request.headers.get("cf-connecting-ip")! } : {}), ...(request.headers.get("user-agent") ? { userAgent: request.headers.get("user-agent")! } : {}), hostname: url.hostname, honeypot: String(data.get("website") ?? "") });
            return renderMailConfirmation(request, root.snapshot, form, schema, prepared.session.values, prepared.session.id, prepared.token);
          }
          const data = await readMailFormBody(request);
          const submission = await mailForms.submitConfirmation({ confirmationId: asMailConfirmationId(String(data.get("confirmationId") ?? "")), token: String(data.get("token") ?? "") });
          return renderMailThanks(request, root.snapshot, submission.id);
        }

        const [activeTheme, site] = await Promise.all([
          themes.resolveActive(siteId),
          cms.store.getSite(siteId),
        ]);
        const siteName = site?.name ?? "";
        const siteLocale = site?.locale ?? "ja";

        const customDetailMatch = url.pathname.match(/^(.*)\/view\/([^/]+)\/?$/);
        if (customDetailMatch) {
          const rootPath = customDetailMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (root?.kind === "content" && root.snapshot.item.contentTypeKey === "custom-content" && root.snapshot.publishedRevision) {
            const definition = await customContent.getCustomContentByContentItem(root.snapshot.item.id);
            if (definition) {
              const entry = await customContent.getPublishedByKey(definition.id, decodeURIComponent(customDetailMatch[2]!));
              if (entry) return renderCustomEntryDetail(request, root.snapshot, definition, entry, await customContent.getTableSchema(definition.tableId), activeTheme, siteName, siteLocale);
            }
          }
        }

        const rssMatch = url.pathname.match(/^(.*)\/rss\.xml$/);
        if (rssMatch) {
          const rootPath = rssMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "blog") return new Response("Not Found", { status: 404 });
          const collection = await blog.getCollectionByContentItem(root.snapshot.item.id);
          if (!collection) return new Response("Not Found", { status: 404 });
          const xml = await blog.renderRss(collection.id, { siteUrl: url.origin });
          return new Response(request.method === "HEAD" ? null : xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=1800", "cache-tag": `site:${siteId},collection:${collection.id},feed:${collection.id}` } });
        }

        const taxonomyMatch = url.pathname.match(/^(.*)\/(category|tag)\/([^/]+)\/?$/);
        if (taxonomyMatch) {
          const rootPath = taxonomyMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "blog") return new Response("Not Found", { status: 404 });
          const collection = await blog.getCollectionByContentItem(root.snapshot.item.id);
          if (!collection) return new Response("Not Found", { status: 404 });
          const term = await blog.findTerm(collection.id, taxonomyMatch[2]!, taxonomyMatch[3]!);
          if (!term) return new Response("Not Found", { status: 404 });
          return renderBlogResponse(request, root.snapshot, blog, collection.id, assets, url, activeTheme, siteName, siteLocale, [term.id], `${term.title}`);
        }

        const resolution = url.pathname === "/"
          ? null
          : await cms.resolvePublicPath(siteId, url.pathname);
        if (url.pathname === "/") {
          const homepage = await cms.resolvePublicPath(siteId, "/home");
          if (homepage?.kind === "content" && homepage.snapshot.publishedRevision) {
            return new Response(null, {
              status: 302,
              headers: {
                location: "/home",
                "cache-control": "public, max-age=60",
              },
            });
          }
          const title = siteName || "baserEdge";
          const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f4f7f5;color:#18382f;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.shell{max-width:760px;margin:12vh auto;padding:48px 40px;background:#fff;border:1px solid #d6e2dc;border-radius:18px;box-shadow:0 18px 50px #153d2d16}h1{margin:0 0 18px;font-size:clamp(2rem,7vw,3.8rem)}p{font-size:1.08rem;line-height:1.8}.mark{color:#2c735b;font-weight:700;letter-spacing:.04em}</style></head><body><main class="shell"><div class="mark">baserEdge</div><h1>${escapeHtml(title)}</h1><p>サイトの開設が完了しました。管理画面を開くと、編集できるホームページが自動で準備されます。</p></main></body></html>`;
          return new Response(request.method === "HEAD" ? null : html, {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store",
              "x-robots-tag": "noindex",
            },
          });
        }
        if (!resolution) return new Response("Not Found", { status: 404 });
        if (resolution.kind === "redirect") {
          return new Response(null, { status: resolution.statusCode, headers: { location: resolution.location, "cache-control": "public, max-age=300" } });
        }
        const snapshot = resolution.snapshot;
        if (!snapshot.publishedRevision) return new Response("Not Found", { status: 404 });
        if (snapshot.item.contentTypeKey === "blog") {
          const collection = await blog.getCollectionByContentItem(snapshot.item.id);
          if (!collection) return new Response("Not Found", { status: 404 });
          return renderBlogResponse(request, snapshot, blog, collection.id, assets, url, activeTheme, siteName, siteLocale);
        }
        if (snapshot.item.contentTypeKey === "mail-form") {
          const form = await mailForms.getFormByContentItem(snapshot.item.id);
          if (!form) return new Response("Not Found", { status: 404 });
          return renderMailForm(request, snapshot, form, await mailForms.getSchema(form.id), activeTheme, siteName, siteLocale, env.TURNSTILE_SITE_KEY);
        }
        if (snapshot.item.contentTypeKey === "custom-content") {
          const definition = await customContent.getCustomContentByContentItem(snapshot.item.id);
          if (!definition) return new Response("Not Found", { status: 404 });
          return renderCustomContentList(request, snapshot, definition, customContent, url, activeTheme, siteName, siteLocale);
        }
        const title = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : "";
        const assetBase = (env.ASSET_BASE_URL ?? "/assets").replace(/\/$/, "");
        const assetUrl = createPublicAssetUrlResolver(assetBase);
        let html = renderPage(snapshot.publishedRevision.document, {
          assetUrl,
          contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`,
        }, {
          title,
          revision: snapshot.publishedRevision,
          theme: activeTheme,
          siteName,
          lang: siteLocale,
          seo: buildPublicPageSeo({
            origin: url.origin,
            path: snapshot.route.path,
            title,
            siteName,
            locale: siteLocale,
            document: snapshot.publishedRevision.document,
            revision: snapshot.publishedRevision,
            openGraphType: snapshot.item.contentTypeKey === "article" ? "article" : "website",
          }),
        });
        if (shouldShowPublishedAdminBanner(url)) {
          html = injectAdminViewBanner(html, "published", snapshot.publishedRevision.id);
        }
        return new Response(request.method === "HEAD" ? null : html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=60, s-maxage=3600",
            "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},revision:${snapshot.publishedRevision.id}`,
            "x-baser-content-id": snapshot.item.id,
            "x-baser-revision-id": snapshot.publishedRevision.id,
          },
        });
      } catch (error) {
        if (error instanceof DomainError) return new Response(error.message, { status: error.status });
        console.error(error);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  };
}

export function createPublicWorker(
  resolveCms: (env: Env) => CmsService = (env) => env.DB ? new CmsService(new D1CmsStore(env.DB)) : memoryCms,
  options: PublicWorkerOptions = {},
) {
  const core = createPublicWorkerCore(resolveCms, options);
  return {
    async fetch(
      request: Request,
      env: Env,
      context?: PublicExecutionContext,
    ): Promise<Response> {
      const startedAt = performance.now();
      const cache = options.cache === undefined ? defaultPublicCache() : options.cache;
      const cacheableRequest = shouldUsePublicResponseCache(request);
      if (cacheableRequest && cache) {
        const cached = await cache.match(request);
        if (cached) return withPerformanceHeaders(cached, "HIT", startedAt);
      }

      const requestEnv = shouldUseReplicaSession(request) && env.DB?.withSession
        ? { ...env, DB: env.DB.withSession("first-unconstrained") }
        : env;
      const response = await core.fetch(request, requestEnv, context);
      if (cacheableRequest && cache && isCacheablePublicResponse(response)) {
        const write = cache.put(request, responseForPublicCache(response)).catch((error) => {
          console.warn("public response cache write failed", error);
        });
        if (context) context.waitUntil(write);
        else await write;
      }
      return withPerformanceHeaders(
        response,
        cacheableRequest && cache ? "MISS" : "BYPASS",
        startedAt,
      );
    },
  };
}

function defaultPublicCache(): PublicResponseCache | null {
  const runtime = globalThis as typeof globalThis & {
    caches?: { default?: PublicResponseCache };
  };
  return runtime.caches?.default ?? null;
}

function responseForPublicCache(response: Response): Response {
  const headers = new Headers(response.headers);
  // There is no cross-Worker tag purge in the Cache API. Keep the edge TTL
  // aligned with the console's public-view freshness contract.
  headers.set("cache-control", "public, max-age=60, s-maxage=60");
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function shouldUsePublicResponseCache(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.search) return false;
  if (url.pathname.startsWith("/_preview/") || url.pathname.startsWith("/assets/")) return false;
  return !/\/(?:confirm|submit)\/?$/.test(url.pathname);
}

function shouldUseReplicaSession(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const pathname = new URL(request.url).pathname;
  return !pathname.startsWith("/_preview/");
}

function isCacheablePublicResponse(response: Response): boolean {
  if (response.status !== 200 && response.status !== 301 && response.status !== 302
    && response.status !== 307 && response.status !== 308) return false;
  if (response.headers.has("set-cookie")) return false;
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  return cacheControl.includes("public") && !cacheControl.includes("no-store");
}

function withPerformanceHeaders(
  response: Response,
  cacheState: "HIT" | "MISS" | "BYPASS",
  startedAt: number,
): Response {
  const headers = new Headers(response.headers);
  headers.set("x-baser-edge-cache", cacheState);
  headers.append("server-timing", `baser;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createAssetService(env: Env): AssetService {
  const bindings = resolveAssetBindings(env);
  return new AssetService({
    metadata: bindings.metadata,
    objects: bindings.objects,
    security: noopSecurity,
    signingSecret: env.ASSET_UPLOAD_SECRET ?? "development-upload-secret-change-me",
    ...(bindings.trialInline ? { trialInline: bindings.trialInline } : {}),
  });
}
function createPreviewService(env: Env, cms: CmsService): PreviewService {
  return new PreviewService({
    store: env.DB ? new D1PreviewStore(env.DB) : memoryPreviews,
    cms,
    security: noopSecurity,
    signingSecret: env.PREVIEW_SECRET ?? "development-preview-secret-change-me",
  });
}
function createBlogService(env: Env, cms: CmsService): BlogService {
  return new BlogService(env.DB ? new D1BlogStore(env.DB) : memoryBlog, cms);
}
function createCustomContentService(env: Env, cms: CmsService): CustomContentService {
  return new CustomContentService(env.DB ? new D1CustomContentStore(env.DB) : memoryCustomContent, cms);
}
function createThemeService(env: Env, cms: CmsService): ThemeService {
  return new ThemeService({ store: env.DB ? new D1ThemeStore(env.DB) : memoryThemes, cms, security: noopSecurity });
}
function createMailFormService(env: Env, cms: CmsService, customContent: CustomContentService): MailFormService {
  return new MailFormService({ store: env.DB ? new D1MailFormStore(env.DB) : memoryMailForms, cms, customContent, signingSecret: env.MAIL_FORM_SECRET ?? "development-mail-form-secret-change-me", ...(env.MAIL_PRIVACY_SALT ? { privacySalt: env.MAIL_PRIVACY_SALT } : {}), botVerifier: env.TURNSTILE_SECRET ? new TurnstileBotVerifier(env.TURNSTILE_SECRET) : new UnavailableBotVerifier() });
}

async function renderBlogResponse(
  request: Request,
  snapshot: Awaited<ReturnType<CmsService["getContent"]>>,
  blog: BlogService,
  collectionId: import("@baser-edge/core-types").CollectionId,
  assets: AssetService,
  url: URL,
  theme: ResolvedThemePresentation,
  siteName: string,
  siteLocale: string,
  termIds: import("@baser-edge/core-types").TermId[] = [],
  suffixTitle = "",
): Promise<Response> {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const collection = await blog.store.getCollection(collectionId);
  if (!collection || !snapshot.publishedRevision) return new Response("Not Found", { status: 404 });
  const list = await blog.listPublishedArticles(collectionId, { limit: collection.pageSize, offset: (page - 1) * collection.pageSize, ...(termIds.length ? { termIds } : {}) });
  const assetBase = "/assets";
  const assetUrl = createPublicAssetUrlResolver(assetBase);
  const baseTitle = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : "Blog";
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl, contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}` }, { title: baseTitle, revision: snapshot.publishedRevision, theme, siteName, lang: siteLocale });
  const cards = list.items.map(renderArticleCard).join("");
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));
  const pagination = totalPages > 1 ? `<nav aria-label="ページ送り">${Array.from({ length: totalPages }, (_, index) => { const number = index + 1; const href = new URL(url); href.searchParams.set("page", String(number)); return number === page ? `<strong aria-current="page">${number}</strong>` : `<a href="${escapeHtml(href.pathname + href.search)}">${number}</a>`; }).join(" ")}</nav>` : "";
  const shellTitle = suffixTitle ? `${suffixTitle} | ${baseTitle}` : baseTitle;
  const seo = buildPublicPageSeo({
    origin: url.origin,
    path: snapshot.route.path,
    title: shellTitle,
    siteName,
    locale: siteLocale,
    document: snapshot.publishedRevision.document,
    revision: snapshot.publishedRevision,
    openGraphType: "website",
  });
  const body = renderShell({
    title: shellTitle,
    siteName,
    theme,
    lang: siteLocale,
    seo,
    headHtml: `<link rel="alternate" type="application/rss+xml" href="${escapeHtml(snapshot.route.path.replace(/\/$/, "") + "/rss.xml")}">`,
    bodyHtml: `${extractBody(intro)}<main class="bc-page"><h1>${escapeHtml(suffixTitle || baseTitle)}</h1><div class="bc-list blog-list">${cards || "<p>公開中の記事はありません。</p>"}</div>${pagination}</main>`,
    bodyAttributes: { "data-theme-release": theme.release.id },
  });
  return new Response(request.method === "HEAD" ? null : body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=1800", "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},collection:${collectionId}`, "x-baser-content-id": snapshot.item.id, "x-baser-revision-id": snapshot.publishedRevision.id } });
}
function renderArticleCard(article: PublishedArticle): string {
  const revision = article.snapshot.publishedRevision!;
  const title = typeof revision.fields.title === "string" ? revision.fields.title : "";
  const terms = article.terms.map((term) => `<span class="term">${escapeHtml(term.title)}</span>`).join("");
  return `<article class="article-card bc-card"><h2><a href="${escapeHtml(article.snapshot.route.path)}">${escapeHtml(title)}</a></h2><time datetime="${new Date(article.postedAt).toISOString()}">${new Date(article.postedAt).toLocaleDateString("ja-JP")}</time><div class="terms">${terms}</div></article>`;
}
function extractBody(html: string): string { const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i); return match?.[1] ?? ""; }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!)); }
async function serveAsset(
  request: Request,
  service: AssetService,
  cms: CmsService,
  previews: PreviewService | undefined,
  env: Env,
  rawId: string,
): Promise<Response> {
  const assetId = asAssetId(rawId);
  if (env.SITE_ID) {
    const siteId = asSiteId(env.SITE_ID);
    const deliverable = await isAssetDeliverableOnPublicSite(cms, previews, siteId, assetId, Date.now());
    if (!deliverable) return new Response("Not Found", { status: 404 });
  }
  const result = await service.getPublicAsset(assetId);
  if (!result) return new Response("Not Found", { status: 404 });
  const headers = new Headers({
    "content-type": result.asset.mediaType,
    "content-length": String(result.asset.byteSize ?? result.object.size),
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-disposition": contentDisposition(result.asset.mediaType, result.asset.originalFilename),
  });
  const etag = result.object.httpEtag ?? `"${result.object.etag}"`;
  headers.set("etag", etag);
  headers.set("content-security-policy", "sandbox; default-src 'none'");
  headers.set("cross-origin-resource-policy", "same-site");
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : result.object.body, { headers });
}
function contentDisposition(mediaType: string, filename: string): string {
  const mode = mediaType.startsWith("image/") || mediaType === "application/pdf" ? "inline" : "attachment";
  return `${mode}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function renderCustomContentList(
  request: Request,
  snapshot: Awaited<ReturnType<CmsService["getContent"]>>,
  definition: import("@baser-edge/custom-content-kernel").CustomContentDefinition,
  service: CustomContentService,
  url: URL,
  theme: ResolvedThemePresentation,
  siteName: string,
  siteLocale: string,
): Promise<Response> {
  if (!snapshot.publishedRevision) return new Response("Not Found", { status: 404 });
  const schema = await service.getTableSchema(definition.tableId);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const filters: Record<string, unknown> = {};
  for (const { definition: field } of schema.fields) {
    const value = url.searchParams.get(`field.${field.key}`);
    if (value !== null) filters[field.key] = parseFilterValue(field.type, value);
  }
  const list = await service.listPublished(definition.id, {
    limit: definition.listCount,
    offset: (page - 1) * definition.listCount,
    ...(url.searchParams.get("q") ? { query: url.searchParams.get("q")! } : {}),
    ...(Object.keys(filters).length ? { filters } : {}),
  });
  const title = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : schema.table.name;
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl: defaultPublicAssetUrl, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision: snapshot.publishedRevision, theme, siteName, lang: siteLocale });
  const cards = list.items.map((entry) => renderCustomEntryCard(entry, schema, snapshot.route.path)).join("");
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));
  const pagination = totalPages > 1 ? `<nav aria-label="ページ送り">${Array.from({length:totalPages},(_,index)=>{const number=index+1;const href=new URL(url);href.searchParams.set("page",String(number));return number===page?`<strong aria-current="page">${number}</strong>`:`<a href="${escapeHtml(href.pathname+href.search)}">${number}</a>`;}).join(" ")}</nav>` : "";
  const seo = buildPublicPageSeo({
    origin: url.origin,
    path: snapshot.route.path,
    title,
    siteName,
    locale: siteLocale,
    document: snapshot.publishedRevision.document,
    revision: snapshot.publishedRevision,
  });
  const html = renderShell({
    title,
    siteName,
    theme,
    lang: siteLocale,
    seo,
    bodyHtml: `${extractBody(intro)}<main class="bc-page"><h1>${escapeHtml(title)}</h1><div class="bc-list custom-list">${cards || "<p>公開中のエントリーはありません。</p>"}</div>${pagination}</main>`,
    bodyAttributes: { "data-theme-release": theme.release.id },
  });
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=60, s-maxage=1800", "cache-tag":`site:${snapshot.item.siteId},content:${snapshot.item.id},custom-content:${definition.id}`, "x-baser-content-id":snapshot.item.id, "x-baser-revision-id":snapshot.publishedRevision.id } });
}
function renderCustomEntryCard(entry: CustomEntrySnapshot, schema: CustomTableSchema, rootPath: string): string {
  const revision = entry.publishedRevision!;
  const displayKey = schema.table.displayFieldKey ?? schema.fields[0]?.definition.key;
  const title = displayKey ? displayValue(revision.values[displayKey]) : entry.entry.id;
  const key = entry.entry.slug ?? entry.entry.id;
  const visible = schema.fields.slice(0,4).map(({definition,relation})=>`<dt>${escapeHtml(relation.labelOverride??definition.name)}</dt><dd>${renderCustomValue(revision.values[definition.key],definition.type)}</dd>`).join("");
  return `<article class="custom-entry bc-card"><h2><a href="${escapeHtml(rootPath.replace(/\/$/,"")+`/view/${encodeURIComponent(key)}`)}">${escapeHtml(title)}</a></h2><dl>${visible}</dl></article>`;
}
function renderCustomEntryDetail(
  request: Request,
  snapshot: Awaited<ReturnType<CmsService["getContent"]>>,
  definition: import("@baser-edge/custom-content-kernel").CustomContentDefinition,
  entry: CustomEntrySnapshot,
  schema: CustomTableSchema,
  theme: ResolvedThemePresentation,
  siteName: string,
  siteLocale: string,
): Response {
  const revision = entry.publishedRevision!;
  const displayKey = schema.table.displayFieldKey ?? schema.fields[0]?.definition.key;
  const title = displayKey ? displayValue(revision.values[displayKey]) : entry.entry.id;
  const fields = schema.fields.map(({ definition, relation }) => `<dt>${escapeHtml(relation.labelOverride ?? definition.name)}</dt><dd>${renderCustomValue(revision.values[definition.key], definition.type)}</dd>`).join("");
  const origin = new URL(request.url).origin;
  const path = `${snapshot.route.path.replace(/\/$/, "")}/view/${encodeURIComponent(entry.entry.slug ?? entry.entry.id)}`;
  const parentRevision = snapshot.publishedRevision;
  if (!parentRevision) {
    return new Response("Not Found", { status: 404 });
  }
  const seo = buildPublicPageSeo({
    origin,
    path,
    title,
    siteName,
    locale: siteLocale,
    document: parentRevision.document,
    revision: parentRevision,
  });
  const html = renderShell({
    title,
    siteName,
    theme,
    lang: siteLocale,
    seo,
    bodyHtml: `<main class="bc-page"><nav><a href="${escapeHtml(snapshot.route.path)}">一覧へ戻る</a></nav><h1>${escapeHtml(title)}</h1><dl>${fields}</dl></main>`,
    bodyAttributes: { "data-theme-release": theme.release.id },
  });
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=1800", "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},custom-entry:${entry.entry.id},custom-entry-revision:${revision.id}` } });
}
function renderCustomValue(value:unknown,type:string):string{if(value===null||value===undefined)return"";if(type==="boolean")return value?"はい":"いいえ";if(type==="asset"&&typeof value==="string")return `<img src="${escapeHtml(defaultPublicAssetUrl(value))}" alt="">`;if(type==="richtext"&&value&&typeof value==="object"){try{return extractBody(renderPage(value as never,{assetUrl:defaultPublicAssetUrl,contentUrl:(id)=>`/content/${encodeURIComponent(id)}`},{title:""}));}catch{return"";}}if(Array.isArray(value))return value.map((item)=>escapeHtml(String(item))).join(", ");return escapeHtml(String(value));}
function displayValue(value:unknown):string{return value===null||value===undefined?"":Array.isArray(value)?value.join(", "):String(value);}
function parseFilterValue(type:string,value:string):unknown{if(type==="integer"||type==="decimal")return Number(value);if(type==="boolean")return value==="true"||value==="1";return value;}



async function readMailFormBody(request:Request):Promise<URLSearchParams>{
  const maximumBytes=262144;const contentType=(request.headers.get("content-type")??"").split(";",1)[0]?.trim().toLowerCase();
  if(contentType!=="application/x-www-form-urlencoded")throw new DomainError("MAIL_FORM_CONTENT_TYPE","Mail form requests must use application/x-www-form-urlencoded",415);
  const declared=Number(request.headers.get("content-length")??"0");if(Number.isFinite(declared)&&declared>maximumBytes)throw new DomainError("MAIL_FORM_BODY_TOO_LARGE","Mail form request is too large",413);
  const bytes=await request.arrayBuffer();if(bytes.byteLength>maximumBytes)throw new DomainError("MAIL_FORM_BODY_TOO_LARGE","Mail form request is too large",413);
  return new URLSearchParams(new TextDecoder().decode(bytes));
}

function renderMailForm(
  request: Request,
  snapshot: Awaited<ReturnType<CmsService["getContent"]>>,
  form: MailFormDefinition,
  schema: CustomTableSchema,
  theme: ResolvedThemePresentation,
  siteName: string,
  siteLocale: string,
  turnstileSiteKey?: string,
): Response {
  const revision = snapshot.publishedRevision!;
  const title = typeof revision.fields.title === "string" ? revision.fields.title : schema.table.name;
  const intro = extractBody(renderPage(revision.document, { assetUrl: defaultPublicAssetUrl, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision, theme, siteName, lang: siteLocale }));
  const fields = schema.fields.map(({ definition, relation }) => renderMailField(definition, relation.labelOverride ?? definition.name, relation.required)).join("");
  const turnstile = form.turnstileRequired ? (turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : `<p class="configuration-warning">Turnstile site key is not configured.</p>`) : "";
  const origin = new URL(request.url).origin;
  const seo = buildPublicPageSeo({
    origin,
    path: snapshot.route.path,
    title,
    siteName,
    locale: siteLocale,
    document: revision.document,
    revision,
  });
  const html = renderShell({
    title,
    siteName,
    theme,
    lang: siteLocale,
    seo,
    headHtml: `<style>${mailCss}</style>`,
    bodyHtml: `${intro}<main class="bc-page"><h1>${escapeHtml(title)}</h1><form method="post" action="${escapeHtml(snapshot.route.path.replace(/\/$/, "") + "/confirm")}">${fields}<label class="honeypot">ウェブサイト<input name="website" tabindex="-1" autocomplete="off"></label>${turnstile}<button type="submit">入力内容を確認する</button></form></main>`,
    bodyAttributes: { "data-theme-release": theme.release.id },
  });
  return new Response(request.method==="HEAD"?null:html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store","x-robots-tag":"noarchive","referrer-policy":"strict-origin-when-cross-origin","content-security-policy":"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'","x-baser-content-id":snapshot.item.id,"x-baser-revision-id":revision.id}});
}
function renderMailField(field: CustomTableSchema["fields"][number]["definition"],label:string,required:boolean):string{
  const name=escapeHtml(field.key);const req=required?" required":"";const description=field.description?`<small>${escapeHtml(field.description)}</small>`:"";let input="";
  switch(field.type){
    case"textarea":input=`<textarea name="${name}" rows="6"${req}></textarea>`;break;
    case"email":input=`<input type="email" name="${name}"${req} autocomplete="email">`;break;
    case"tel":input=`<input type="tel" name="${name}"${req} autocomplete="tel">`;break;
    case"integer":case"decimal":input=`<input type="number" name="${name}"${field.type==="decimal"?' step="any"':''}${req}>`;break;
    case"date":input=`<input type="date" name="${name}"${req}>`;break;
    case"datetime":input=`<input type="datetime-local" name="${name}"${req}>`;break;
    case"boolean":input=`<input type="checkbox" name="${name}" value="true">`;break;
    case"select":input=`<select name="${name}"${req}><option value="">選択してください</option>${field.options.map((o)=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select>`;break;
    case"multiselect":input=`<select name="${name}" multiple${req}>${field.options.map((o)=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select>`;break;
    default:input=`<input type="text" name="${name}"${req}>`;
  }
  return `<label><span>${escapeHtml(label)}${required?' <b aria-label="必須">*</b>':''}</span>${description}${input}</label>`;
}
function renderMailConfirmation(request:Request,snapshot:Awaited<ReturnType<CmsService["getContent"]>>,form:MailFormDefinition,schema:CustomTableSchema,values:Record<string,unknown>,confirmationId:string,token:string):Response{
  const rows=schema.fields.map(({definition,relation})=>`<dt>${escapeHtml(relation.labelOverride??definition.name)}</dt><dd>${escapeHtml(displayValue(values[definition.key]))}</dd>`).join("");
  const path=snapshot.route.path.replace(/\/$/,"");const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>入力内容の確認</title><style>${mailCss}</style></head><body><main><h1>入力内容の確認</h1><dl>${rows}</dl><form method="post" action="${escapeHtml(path+"/submit")}"><input type="hidden" name="confirmationId" value="${escapeHtml(confirmationId)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">送信する</button></form><p><a href="${escapeHtml(snapshot.route.path)}">入力画面へ戻る</a></p></main></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store","x-robots-tag":"noindex, nofollow, noarchive","referrer-policy":"no-referrer","content-security-policy":"default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"}});
}
function renderMailThanks(request:Request,snapshot:Awaited<ReturnType<CmsService["getContent"]>>,submissionId:string):Response{
  const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>送信完了</title><style>${mailCss}</style></head><body><main><h1>送信しました</h1><p>お問い合わせを受け付けました。</p><p class="receipt">受付番号: ${escapeHtml(submissionId)}</p><p><a href="/">トップへ戻る</a></p></main></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{status:201,headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store","x-robots-tag":"noindex, nofollow, noarchive","referrer-policy":"no-referrer","content-security-policy":"default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'"}});
}
const mailCss=`body{font-family:system-ui,sans-serif;max-width:52rem;margin:auto;padding:1rem;line-height:1.7}main{display:grid;gap:1rem}form{display:grid;gap:1rem}label{display:grid;gap:.35rem}input,textarea,select,button{font:inherit;padding:.7rem;border:1px solid #999;border-radius:.4rem}button{width:max-content;background:#111;color:#fff;border-color:#111}small{color:#555}dl{display:grid;grid-template-columns:minmax(8rem,14rem) 1fr;gap:.6rem 1rem}dt{font-weight:700}dd{margin:0;white-space:pre-wrap}.honeypot{position:absolute;left:-10000px}.configuration-warning{padding:.7rem;border:1px solid #b00;color:#900}.receipt{font-family:ui-monospace,monospace}`;

export default createPublicWorker();
