# Admin SPA router policy (`apps/admin-web`)

## Problem

React Router **data-router-only** APIs (notably `useBlocker`) **throw at runtime** when the app uses `<BrowserRouter>`. The UI goes blank with no build-time error. This already regressed once when adding editor leave guards.

## Required stack

| Layer | Requirement |
|-------|-------------|
| Entry | `main.tsx` → `<RouterProvider router={adminRouter} />` |
| Routes | `router.tsx` → `createBrowserRouter([...], { basename: "/console" })` |
| Forbidden | `BrowserRouter`, `Routes`/`Route` in new entry paths (legacy `App.tsx` is not the entry) |

## Data-router-only hooks (non-exhaustive)

Do not import these unless `verify-admin-router` and this doc are updated:

- `useBlocker` / `unstable_useBlocker`
- `useFetcher`, `useFetchers`, `useRevalidator`
- `useLoaderData`, `useRouteLoaderData`, `useActionData`, `useSubmit`

## Where `useBlocker` is allowed

Only **`apps/admin-web/src/hooks/useEditorLeaveGuard.ts`**. Pages must use `useEditorLeaveGuard`, not `useBlocker` directly.

## CI

`npm run verify:admin-router` (part of `npm run check`) enforces:

1. Allowlisted files only may import data-router-only hooks.
2. When those hooks exist, `main.tsx` + `router.tsx` satisfy the data router contract.
3. No `BrowserRouter` under `apps/admin-web/src`.

`npm test` runs `build:admin-web` before `node --test`, so browser smoke tests always use a fresh `apps/admin-web/dist`. Locally, install Chromium once: `npx playwright install chromium` (GitHub Actions `ci` workflow does this before `npm run check`).

## Runtime safety net

- **`ConsoleErrorBoundary`** in `main.tsx` shows a recoverable error UI instead of a blank page when render throws (production builds show a generic message; dev shows `error.message`).
- **`tests/admin-console-browser-smoke.test.mjs`** serves `dist`, mocks `/v1/*`, and asserts `/console/content/:id` and `/console/custom/:definitionId/entries/:entryId` mount without `pageerror`.

## Adding a new data-router feature

1. Prefer extending `useEditorLeaveGuard` or add a new hook under `hooks/` and **append to `HOOK_IMPORT_ALLOWLIST`** in `scripts/verify-admin-router.mjs`.
2. Never reintroduce `BrowserRouter` for convenience.
3. Optional: add a row to `tests/content-editor-sync.test.mjs` if behavior is user-visible.
