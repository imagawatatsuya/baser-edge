#!/usr/bin/env node
/**
 * Serve apps/admin-web/dist for browser smoke tests (SPA fallback under /console/).
 */
import { createServer } from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(root, "apps", "admin-web", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

export function createAdminDistServer() {
  if (!existsSync(join(distRoot, "index.html"))) {
    throw new Error("admin-web dist missing — run npm run build:admin-web");
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let pathname = url.pathname;

    if (pathname === "/console") {
      res.writeHead(301, { location: "/console/" });
      res.end();
      return;
    }

    let filePath;
    if (pathname.startsWith("/console/")) {
      const rel = pathname.slice("/console/".length);
      filePath = rel ? join(distRoot, rel) : join(distRoot, "index.html");
    } else {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(distRoot, "index.html");
    }

    const body = readFileSync(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  });

  return { server, distRoot };
}

export function listenAdminDistServer(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}
