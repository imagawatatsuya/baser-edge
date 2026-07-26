#!/usr/bin/env node
import { build } from "vite";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const outDir = join(root, "deploy", "_onboarding-host-bundle");

await build({
  configFile: false,
  root,
  logLevel: "info",
  resolve: {
    preserveSymlinks: true,
  },
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: join(root, "apps", "onboarding-worker", "src", "index.ts"),
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        format: "es",
      },
    },
  },
});
