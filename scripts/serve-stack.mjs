import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { createPublicWorker } from "../apps/public-renderer/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";
import { AssetService, MemoryAssetMetadataStore, MemoryAssetObjectStore } from "@baser-edge/asset-kernel";
import { MemoryPreviewStore, PreviewService } from "@baser-edge/preview-kernel";
import { BlogService, MemoryBlogStore } from "@baser-edge/blog-kernel";
import { CustomContentService, MemoryCustomContentStore } from "@baser-edge/custom-content-kernel";
import { MailFormService, MemoryMailFormStore, MemoryMailSender } from "@baser-edge/mail-form-kernel";
import { MemoryThemeStore, ThemeService } from "@baser-edge/theme-kernel";
import { seedLocalStack } from "./local-stack-seed.mjs";

const consoleRoot = fileURLToPath(new URL("../apps/admin-web/dist/", import.meta.url));
const adminMime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

const cms = new CmsService(new MemoryCmsStore());
const security = {
  authorize: cms.authorizeOperation.bind(cms),
  success: cms.recordSuccessfulOperation.bind(cms),
};
const assets = new AssetService({
  metadata: new MemoryAssetMetadataStore(),
  objects: new MemoryAssetObjectStore(),
  security,
  signingSecret: "development-upload-secret-change-me",
  usageInspector: { listPublishedReferences: cms.store.listPublishedAssetReferences.bind(cms.store) },
});
const blog = new BlogService(new MemoryBlogStore(), cms);
const customContent = new CustomContentService(new MemoryCustomContentStore(), cms);
const mailSender = new MemoryMailSender();
const mailForms = new MailFormService({ store: new MemoryMailFormStore(), cms, customContent, signingSecret: "development-mail-form-secret-change-me", sender: mailSender });
const themes = new ThemeService({ store: new MemoryThemeStore(), cms, security });
const previews = new PreviewService({
  store: new MemoryPreviewStore(),
  cms,
  security,
  signingSecret: "development-preview-secret-change-me",
});
const api = createApiWorker(() => cms, { resolveAssets: () => assets, resolvePreviews: () => previews, resolveBlog: () => blog, resolveCustomContent: () => customContent, resolveMailForms: () => mailForms, resolveThemes: () => themes });
const publicWorker = createPublicWorker(() => cms, { resolveAssets: () => assets, resolvePreview: () => previews, resolveBlog: () => blog, resolveCustomContent: () => customContent, resolveMailForms: () => mailForms, resolveThemes: () => themes });

const hint = await seedLocalStack({ cms, themes });
let defaultSiteId = hint.siteId;
const instantOwnerHint = {
  workspaceId: hint.workspaceId,
  ownerPrincipalId: hint.ownerPrincipalId,
  siteId: hint.siteId,
  siteName: "ローカルサイト",
  publicUrl: "http://localhost:8788",
};
const apiEnv = {
  PUBLIC_BASE_URL: "http://localhost:8787",
  PREVIEW_BASE_URL: "http://localhost:8788",
  LOCAL_DEV_LOGIN_HINT: JSON.stringify(hint),
  BASER_INSTANT_LOGIN: "true",
  BASER_INSTANT_OWNER_HINT: JSON.stringify(instantOwnerHint),
  BASER_AUTH_ORIGIN: "http://localhost:8787",
  BASER_BOOTSTRAP_SECRET: "local-dev-bootstrap-passkey",
};

console.log("管理画面: http://localhost:8787/console/ （「管理をはじめる」でログイン）");
console.log("（/admin/* は廃止済み → /console/ へリダイレクト）");

serve(8787, async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/console" || url.pathname.startsWith("/console/")) {
    return serveConsoleApp(url.pathname);
  }
  if (url.pathname === "/" && request.method === "GET") {
    return Response.redirect(`${url.origin}/console/`, 302);
  }
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    return redirectLegacyAdmin(url);
  }
  return api.fetch(request, apiEnv);
}, "API + Admin");
serve(8788, async (request) => {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId") ?? defaultSiteId;
  return publicWorker.fetch(request, siteId ? { SITE_ID: siteId } : {});
}, "Public / Preview");

function redirectLegacyAdmin(url) {
  const dest = new URL("/console/", url.origin);
  if (url.pathname.includes("login")) {
    dest.pathname = "/console/login";
  }
  return Response.redirect(dest.toString(), 308);
}

async function serveConsoleApp(pathname) {
  const base = "/console/";
  let relative = pathname === "/console" || pathname === "/console/" ? "index.html" : pathname.slice(base.length);
  if (!relative.includes(".") && !relative.endsWith(".html")) relative = "index.html";
  const safe = relative.replace(/^(\.\.(\/|\\|$))+/, "");
  try {
    const data = await readFile(join(consoleRoot, safe));
    const type = adminMime[extname(safe)] ?? "application/octet-stream";
    return new Response(data, { headers: { "content-type": type } });
  } catch {
    try {
      const data = await readFile(join(consoleRoot, "index.html"));
      return new Response(data, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch {
      return new Response("Console app not built. Run: npm run build -w @baser-edge/admin-web", { status: 503 });
    }
  }
}

function serve(port, handler, label) {
  createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(`http://${incoming.headers.host ?? `localhost:${port}`}${incoming.url ?? "/"}`, {
        method: incoming.method,
        headers: incoming.headers,
        ...(body ? { body, duplex: "half" } : {}),
      });
      const response = await handler(request);
      outgoing.statusCode = response.status;
      const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      for (const cookie of setCookies) outgoing.appendHeader("set-cookie", cookie);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        outgoing.setHeader(key, value);
      });
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.statusCode = 500;
      outgoing.end(String(error));
    }
  }).listen(port, () => console.log(`baserEdge ${label}: http://localhost:${port}`));
}
