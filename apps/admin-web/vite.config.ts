import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL("../../", import.meta.url)));

function readStackLocalEnv(): { apiOrigin?: string; publicOrigin?: string } | null {
  try {
    const path = join(repoRoot, ".baser", "stack-local-env.json");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as { apiOrigin?: string; publicOrigin?: string };
  } catch {
    return null;
  }
}

const stack = readStackLocalEnv();
const apiProxyTarget =
  process.env.BASER_STACK_API_ORIGIN
  ?? stack?.apiOrigin
  ?? `http://localhost:${process.env.BASER_STACK_API_PORT ?? 8787}`;

export default defineConfig({
  plugins: [react()],
  base: "/console/",
  server: {
    port: 5173,
    proxy: {
      "/v1": { target: apiProxyTarget, changeOrigin: true },
    },
  },
});
