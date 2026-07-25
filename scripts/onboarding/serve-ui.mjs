import { existsSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const distRoot = join(root, "apps/onboarding-web/dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
};

export function onboardingUiDistReady() {
  return existsSync(join(distRoot, "index.html"));
}

function safePathUnderDist(urlPath) {
  let rel = urlPath.replace(/^\/start\/?/, "") || "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const file = join(distRoot, rel);
  if (!file.startsWith(distRoot)) return null;
  return file;
}

/** @returns {boolean} handled */
export function tryServeOnboardingUi(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!onboardingUiDistReady()) return false;
  if (!url.pathname.startsWith("/start")) return false;

  const file = safePathUnderDist(url.pathname);
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    const fallback = join(distRoot, "index.html");
    if (!existsSync(fallback)) return false;
    res.writeHead(200, { "content-type": MIME[".html"] });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    res.end(readFileSync(fallback));
    return true;
  }

  const type = MIME[extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  res.end(readFileSync(file));
  return true;
}
