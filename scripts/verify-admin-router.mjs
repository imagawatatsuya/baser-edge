#!/usr/bin/env node
/**
 * Prevent admin SPA regressions: data-router-only React Router hooks (e.g. useBlocker)
 * require createBrowserRouter + RouterProvider — BrowserRouter crashes at runtime.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const adminSrc = join(root, "apps", "admin-web", "src");

/** Hooks that throw unless mounted under a data router (React Router 6.4+). */
const DATA_ROUTER_ONLY = [
  "useBlocker",
  "unstable_useBlocker",
  "useFetcher",
  "useFetchers",
  "useRevalidator",
  "useActionData",
  "useLoaderData",
  "useRouteLoaderData",
  "useSubmit",
  "useMatches",
];

/** Only these paths may import data-router-only hooks (extend deliberately). */
const HOOK_IMPORT_ALLOWLIST = new Set([
  "hooks/useEditorLeaveGuard.ts",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(path);
  }
  return out;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function importsDataRouterHook(source) {
  const code = stripComments(source);
  for (const hook of DATA_ROUTER_ONLY) {
    const fromRrd = new RegExp(`import\\s*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s*from\\s*["']react-router-dom["']`);
    const fromRr = new RegExp(`import\\s*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s*from\\s*["']react-router["']`);
    if (fromRrd.test(code) || fromRr.test(code)) return hook;
    if (new RegExp(`\\b${hook}\\s*\\(`).test(code) && !fromRrd.test(code) && !fromRr.test(code)) {
      if (hook === "useBlocker") return hook;
    }
  }
  return null;
}

const files = walk(adminSrc);
const violations = [];

for (const abs of files) {
  const rel = relative(adminSrc, abs).replace(/\\/g, "/");
  const source = readFileSync(abs, "utf8");
  const hook = importsDataRouterHook(source);
  if (!hook) continue;
  if (!HOOK_IMPORT_ALLOWLIST.has(rel)) {
    violations.push(`${rel}: imports or calls ${hook} but is not in HOOK_IMPORT_ALLOWLIST`);
  }
}

const mainPath = join(adminSrc, "main.tsx");
const routerPath = join(adminSrc, "router.tsx");
const main = readFileSync(mainPath, "utf8");
const router = readFileSync(routerPath, "utf8");

const usesDataRouterHooks = files.some((abs) => {
  const rel = relative(adminSrc, abs).replace(/\\/g, "/");
  if (!HOOK_IMPORT_ALLOWLIST.has(rel)) return false;
  return Boolean(importsDataRouterHook(readFileSync(abs, "utf8")));
});

if (usesDataRouterHooks) {
  if (/BrowserRouter/.test(main)) {
    violations.push("main.tsx: BrowserRouter must not be used when data-router-only hooks are active");
  }
  if (!/RouterProvider/.test(main)) {
    violations.push("main.tsx: must render <RouterProvider router={...} />");
  }
  if (!/adminRouter|router\.tsx/.test(main)) {
    violations.push("main.tsx: must import the createBrowserRouter instance from router.tsx");
  }
  if (!/createBrowserRouter\s*\(/.test(router)) {
    violations.push("router.tsx: must call createBrowserRouter(...)");
  }
}

for (const abs of files) {
  const rel = relative(adminSrc, abs).replace(/\\/g, "/");
  if (rel === "main.tsx" || rel === "router.tsx") continue;
  const source = readFileSync(abs, "utf8");
  if (/\bBrowserRouter\b/.test(stripComments(source))) {
    violations.push(`${rel}: do not use BrowserRouter in admin-web (use router.tsx + RouterProvider)`);
  }
}

if (violations.length > 0) {
  console.error("verify-admin-router: failed\n");
  for (const v of violations) console.error(`  - ${v}`);
  console.error("\nSee docs/engineering/admin-spa-router-policy.md");
  process.exit(1);
}

console.log("verify-admin-router: ok");
