# API validation audit (`apps/api-worker`)

Living inventory of **existing** `/v1/*` routes against [validation-policy.md](./validation-policy.md). Update this file when routes or test coverage change.

**Legend — columns**

| Column | Meaning |
|--------|---------|
| **Domain** | Kernel / service enforces invariants (slug, locks, schema, authz) |
| **API** | Worker uses typed field helpers and closed enums |
| **−T** | At least two automated rejection cases (422/409/403) for this surface |
| **Status** | **OK** = domain + API + −T; **Partial** = missing −T or weak API parsing; **Gap** = known weak domain or parse |

**Test map (primary)**

| File | Covers |
|------|--------|
| `tests/console-golden-path.test.mjs` | Auth, blog/article, revise lock, publish, public HTML, console capabilities |
| `tests/api-worker.test.mjs` | Pages, tree, copy/trash, assets, previews, blogs list, P1/P2 rejections |
| `tests/api-validation.test.mjs` | Slug HTTP 422, blog pagination, approval inbox |
| `tests/auth.test.mjs` | Passkeys, session, step-up, CSRF |
| `tests/theme.test.mjs` | Theme releases, activation |
| `tests/custom-content.test.mjs` | Fields, tables, entries, approve/publish |
| `tests/mail-form.test.mjs` | Mail form admin + public submit/replay |
| `tests/content-flow.test.mjs` | Approval/publish flow |
| `tests/plugin.test.mjs` | Plugin lifecycle |
| `tests/baser-domain.test.mjs` | `normalizeSlug` (not HTTP); `normalizeSiteHostname` |

---

## Health & dev

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/health` | GET | — | — | — | OK | No body |
| `/v1/console/capabilities` | GET | — | — | Y | OK | R2 binding → `assetPublicDelivery`; UI: `PublicMediaDeliveryGuide` on media / image edit |
| `/v1/dev/local-login-hint` | GET | — | — | — | Partial | Dev-only; no abuse tests |

---

## Bootstrap & identity

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/bootstrap` | POST | Y | Y | Y | OK | Prod gate + provision secret; `normalizeSiteHostname`; rejection tests in `api-validation.test.mjs` |
| `/v1/bootstrap/ready` | POST | N/A | N/A | Y | OK | Non-mutating provision-secret readiness probe; missing/wrong secret rejection + success tests |
| `/v1/principals` | POST | Y | Y | Partial | Partial | Happy path in flows only |
| `/v1/grants` | POST | Y | Y | Y | OK | Closed `scope` keys; unknown fields → 422 |
| `/v1/delegations` | POST | Y | Y | Partial | Partial | |
| `/v1/audit` | GET | Y | Y | Y | OK | `workspaceId` query uses `ws_` prefixed id validation |

---

## Auth (`auth-routes.ts`)

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/auth/passkeys/register/*` | POST | Y | Y | Y | OK | `tests/auth.test.mjs` |
| `/v1/auth/login/*` | POST | Y | Y | Y | OK | |
| `/v1/auth/session` | GET | Y | — | Partial | Partial | |
| `/v1/auth/sessions` | GET, DELETE | Y | Y | Partial | Partial | |
| `/v1/auth/logout` | POST | Y | Y | Partial | Partial | CSRF |
| `/v1/auth/step-up/*` | POST | Y | Y | Y | OK | Golden path |

---

## Content tree (CMS)

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/pages` | POST | Y | Y | Y | OK | Slug via domain; `api-validation.test.mjs` INVALID_SLUG |
| `/v1/folders` | POST | Y | Y | Y | OK | Same |
| `/v1/aliases` | POST | Y | Y | Y | OK | INVALID_SLUG in `api-validation.test.mjs` |
| `/v1/blogs` | POST | Y | Y | Y | OK | `pageSize`/`feedSize` bounded 1–100 when present |
| `/v1/sites/:siteId/content-tree` | GET | Y | Y | Y | OK | `sitePathId` (`site_` + UUID) |
| `/v1/sites/:siteId/trash` | GET | Y | Y | Partial | Partial | `sitePathId` |
| `/v1/content/:id` | GET | Y | — | Partial | Partial | |
| `/v1/content/:id/revisions` | POST | Y | Y | Y | OK | Golden path: missing `expectedLockVersion` |
| `/v1/content/:id/approvals` | POST | Y | Y | Partial | Partial | |
| `/v1/sites/:siteId/pending-approvals` | GET | Y | — | Partial | Partial | Console approvals inbox |
| `/v1/approvals/:id/decide` | POST | Y | Y | Partial | Partial | |
| `/v1/content/:id/publish` | POST | Y | Y | Y | OK | Golden path |
| `/v1/content/:id/agent-proposals` | POST | Y | Y | Y | OK | `blockOperationsField`; rejection tests in `api-worker.test.mjs` |
| `/v1/content/:id/move-impact` | POST | Y | Y | Y | OK | `newSlug` via domain; INVALID_SLUG in `api-validation.test.mjs` |
| `/v1/content/:id/move` | POST | Y | Y | Y | OK | `expectedTreeVersion`; stale → 409 in `api-worker.test.mjs` |
| `/v1/content/:id/copy` | POST | Y | Y | Y | OK | Happy path + INVALID_SLUG + stale tree in tests |
| `/v1/content/:id/trash` | POST | Y | Y | Y | OK | Stale tree → 409; ALREADY_TRASHED in `api-worker.test.mjs` |
| `/v1/content/:id/restore` | POST | Y | Y | Y | OK | Stale tree → 409 in `api-worker.test.mjs` |
| `/v1/content/:id/previews` | POST | Y | Y | Partial | Partial | Preview tests in `assets-preview.test.mjs` |
| `/v1/previews/:id/revoke` | POST | Y | — | Partial | Partial | |

---

## Blog & taxonomy

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/blogs/:id/articles` | POST | Y | Y | Partial | Partial | Golden path create |
| `/v1/blogs/:id/articles` | GET | Y | Y | Y | OK | `optionalQueryInt` for limit (≤100) and offset |
| `/v1/blogs/:id/taxonomies` | GET, POST | Y | Y | Partial | Partial | |
| `/v1/taxonomies/:id/terms` | POST | Y | Y | Partial | Partial | |
| `/v1/articles/:id/revisions/:rev/terms` | PUT | Y | Y | Gap | Partial | |
| `/v1/sites/:siteId/blogs` | GET | Y | — | Partial | Partial | |

---

## Custom content

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/custom-fields` | GET, POST | Y | Y | Partial | Partial | `custom-content.test.mjs` |
| `/v1/custom-tables` | GET, POST | Y | Y | Partial | Partial | |
| `/v1/custom-tables/:id/schema` | GET | Y | — | Partial | Partial | |
| `/v1/custom-tables/:id/fields` | POST | Y | Y | Partial | Partial | |
| `/v1/custom-contents` | POST | Y | Y | Y | OK | INVALID_SLUG in `api-validation.test.mjs` |
| `/v1/sites/:siteId/custom-contents` | GET | Y | — | Partial | Partial | |
| `/v1/custom-contents/:id/entries` | GET, POST | Y | Y | Partial | Partial | Typed values in kernel |
| `/v1/custom-entries/:id` | GET | Y | — | Partial | Partial | |
| `/v1/custom-entries/:id/revisions` | POST | Y | Y | Partial | Partial | Lock version like CMS |
| `/v1/custom-entries/:id/approvals` | POST | Y | Y | Partial | Partial | |
| `/v1/custom-entry-approvals/:id/decide` | POST | Y | Y | Partial | Partial | |
| `/v1/custom-entries/:id/publish` | POST | Y | Y | Partial | Partial | |

---

## Mail forms

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/mail-forms` | POST | Y | Y | Partial | Partial | Header injection rules in kernel |
| `/v1/sites/:siteId/mail-forms` | GET | Y | — | Partial | Partial | |
| `/v1/mail-forms/:id/submissions` | GET | Y | — | Partial | Partial | |
| `/v1/mail-submissions/:id` | GET | Y | Partial | Partial | Partial | `includeSensitive` flag |
| `/v1/mail-submissions/:id/purge` | POST | Y | — | Partial | Partial | |
| `/v1/mail-notifications/deliver` | POST | Y | Y | Y | OK | `limit` integer 1–100; default 20 |

Public mail submit (renderer, not api-worker) — see `tests/mail-form.test.mjs` (replay 409).

---

## Assets & uploads

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/assets/upload-sessions` | POST | Y | Y | Partial | Partial | MIME/size in kernel |
| `/v1/assets/uploads/:id` | PUT | Y | Partial | Partial | Partial | Token query required |
| `/v1/assets` | GET | Y | Partial | Partial | Partial | |
| `/v1/assets/:id` | GET, DELETE | Y | — | Partial | Partial | DELETE mirrored in `MediaLibraryPage` (`ASSET_IN_USE` UI) |

---

## Themes

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/themes` | POST | Y | Y | Partial | Partial | |
| `/v1/workspaces/:id/themes` | GET | Y | — | Partial | Partial | |
| `/v1/themes/:id/token-revisions` | POST | Y | Y | Y | OK | `theme.test.mjs` |
| `/v1/themes/:id/layout-revisions` | POST | Y | Y | Y | OK | |
| `/v1/themes/:id/releases` | GET, POST | Y | Y | Y | OK | |
| `/v1/sites/:id/theme` | GET | Y | — | Partial | Partial | |
| `/v1/sites/:id/theme-activations` | POST | Y | Y | Y | OK | |

---

## Plugins

| Route | Methods | Domain | API | −T | Status | Notes |
|-------|---------|--------|-----|-----|--------|-------|
| `/v1/plugins` | POST | Y | Y | Partial | Partial | `plugin.test.mjs` |
| `/v1/workspaces/:id/plugins` | GET | Y | — | Partial | Partial | |
| `/v1/plugins/:id/releases` | GET, POST | Y | Y | Partial | Partial | Manifest validators |
| `/v1/plugin-releases/:id/invocations` | GET | Y | — | Partial | Partial | |
| `/v1/workspaces/:id/plugin-activations` | GET, POST | Y | Y | Partial | Partial | |
| `/v1/plugin-activations/:id` | DELETE | Y | — | Partial | Partial | |
| `/v1/workspaces/:id/plugin-admin-extensions` | GET | Y | — | Partial | Partial | |
| `/v1/plugin-routes/:key/*` | GET, POST | Y | Partial | Y | OK | Trust boundary: activated plugin only; POST body must be object; `workspaceId`/`siteId` validated |

---

## Prioritized hardening backlog

Work in this order unless a feature touches a specific route.

| P | Item | Routes / area | Suggested work |
|---|------|---------------|----------------|
| P0 | Slug rejection at HTTP | `POST /v1/pages`, `/folders`, `/blogs`, `/articles`, move/copy | Add tests: non-ASCII slug → 422 `INVALID_SLUG` | Done (`api-validation.test.mjs`) |
| P0 | Pagination bounds | `GET /v1/blogs/:id/articles` | `numberField` or bounded parser for limit/offset | Done (`optionalQueryInt`) |
| P1 | Tree conflicts | move, copy, trash, restore | Tests for wrong `expectedTreeVersion` → 409 | Done (`api-worker.test.mjs`) |
| P1 | Grants scope | `POST /v1/grants` | Schema for `scope`; reject unknown keys | Done |
| P1 | Mail deliver limit | `POST /v1/mail-notifications/deliver` | `numberField` + max cap | Done |
| P2 | Workspace query IDs | Many `GET ?workspaceId=` | Validate ID format before store | Done (`parsePrefixedId`) |
| P2 | Plugin route proxy | `/v1/plugin-routes/*` | Document trust boundary; tighten optional body | Done |
| P2 | Agent proposals | `agent-proposals` | Validate operation shapes; rejection tests | Done |

| P3 | Bootstrap hostname | `POST /v1/bootstrap` | `normalizeSiteHostname` in domain; HTTP rejection tests | Done |
| P3 | Alias / custom-content slugs | `POST /v1/aliases`, `/custom-contents` | INVALID_SLUG HTTP tests | Done |
| P3 | Site path IDs | `GET /v1/sites/:siteId/*` | `sitePathId` + malformed path test | Done (partial route coverage) |

---

## Admin console (`apps/admin-web`)

| Surface | Server mirror | −T | Status | Notes |
|---------|---------------|-----|--------|-------|
| Create page/blog/article modals | `lib/slug.ts` | Partial | Partial | Slug ASCII; title Unicode OK |
| Content edit save | API revise | Y | OK | Golden path + lock version test |
| Login / CSRF | auth API | Y | OK | `auth.test.mjs` + client retry |

When adding a console form, add a row here and link the test file.

---

## Hosted onboarding (`apps/onboarding-worker`)

This surface is outside `/v1/*`, but follows the same validation bar because it provisions external Cloudflare resources.

| Route / surface | Methods | Domain | API | −T | Status | Notes |
|-----------------|---------|--------|-----|-----|--------|-------|
| `/api/onboarding/sessions` | POST | Y | Partial | Partial | Partial | OAuth grant or manual token; public mode rejects manual tokens |
| `/api/onboarding/destroy` → Operations Service Binding | POST | Y | Y | Y | OK | Hosted `trial` is forced server-side; broker request requires shared Secret; success + missing-token + non-trial rejection tests in `cf-stack-destroy.test.mjs` |
| `TRIAL_PROVISION_QUEUE` | Queue | Y | Y | Y | OK | `parseTrialProvisionQueueMessage`; encrypted token only; success + two rejection tests in `cf-trial-provision-parse.test.mjs` |
