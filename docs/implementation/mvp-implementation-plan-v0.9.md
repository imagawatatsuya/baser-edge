# MVP implementation plan v0.9

## Theme

**Raise the admin console from a golden-path probe to a product-grade operator surface**, in parallel with production identity work from v0.8. API kernels remain the source of truth; this milestone defines what ships in `apps/admin-web`.

Authority: [ADR-0020](../adr/0020-admin-console-as-product-surface.md), [admin-console-v0.1](../architecture/admin-console-v0.1.md).

## Completed before v0.9 (carry forward)

- v0.8 Plugin runtime, diagnostics, and local admin identity prototype
- Passkey login, session cookies, CSRF, step-up hooks (in progress / landed per ADR-0019)
- Console golden path: blog/article, save, approve, publish, public verify (`tests/console-golden-path.test.mjs`)
- Slug ASCII policy (domain + admin client)

## Completed in v0.9 console milestone

- [x] C1 Block editor, revision badges, shared UI primitives
- [x] C2 Tree create page/folder, move, copy, trash + trash page restore
- [x] C3 Media upload/list, asset picker in editor
- [x] C4 Approvals inbox (`GET /v1/sites/:siteId/approval-inbox`), agent filter, custom entry deep links, mail list
- [x] C5 Theme + plugin activation/deactivation UI with step-up
- [x] Tree drag-and-drop move to folder/blog/root
- [x] Custom entry edit + publish flow
- [x] P0 API validation tests (slug, pagination, inbox)

## Console phases

### C0 — Probe (current, frozen)

**Scope:** Login, tree browse (limited), article/page edit via title + textarea, save/publish with approval, preview/live links.

**Rule:** No expansion of C0 scope except bugfixes and validation hardening. New operator features require C1+.

- [x] `ConsoleScopeBanner` states limited scope
- [x] Golden path test

---

### C1 — Trustworthy editor core (next)

**Goal:** Operators trust save/publish and edit structured content without API literacy.

| Deliverable | Acceptance |
|-------------|------------|
| Shared UI primitives | Buttons, modals, form fields, status banner used across content flows |
| Revision state UI | Badges: 下書き / 承認待ち / 公開中; toolbar reflects what will hit the public site |
| Structured body | Page/Article body edited as Structured Document blocks (minimum: paragraph + heading); no textarea as long-term canonical editor |
| Save/publish copy | Clear Japanese strings; publish disabled with visible reason when approval missing |
| Mobile layout | Content edit and publish flow usable at 375px width |
| Tests | Golden path still green; block revise reflected in public HTML |

**Out of scope for C1:** Tree DnD, media library, custom content screens.

---

### C2 — Site tree operations

**Goal:** Content Manager parity for day-to-day placement and lifecycle.

| Deliverable | Acceptance |
|-------------|------------|
| Create page/folder | Modals from tree parent context |
| Move / copy | `move-impact` preview; `expectedTreeVersion` handled; user sees conflict errors |
| Trash / restore | Trash list UI; restore with slug conflict surfaced |
| Alias | Visible in tree; warning when target not published |
| Tests | API tree tests + console or integration test for move + trash round-trip |

---

### C3 — Media and preview

**Goal:** Meet PR v0.3 mobile asset + honest preview.

| Deliverable | Acceptance |
|-------------|------------|
| Media nav enabled | List assets; upload via upload-session |
| Asset in document | Insert AssetReference into Structured Document from picker |
| Preview | Draft preview uses revision after save; admin-view banner unchanged |
| Tests | Extend `assets-preview` or console test for upload + reference in publish |

---

### C4 — Workflow and modules

**Goal:** Scale operations beyond a single article.

| Deliverable | Acceptance |
|-------------|------------|
| Approval inbox | List pending; approve/reject; step-up when required |
| Custom content | Entry list/edit for one table type; publish path |
| Mail form | Submissions list; PII behind step-up |
| Agent proposals | Visible as approval candidates when API returns them |

---

### C5 — Activation admin (gated)

**Goal:** Safe theme/plugin operations with step-up UX.

| Deliverable | Acceptance |
|-------------|------------|
| Theme activation | List releases; activate with step-up |
| Plugin activation | Capability consent UI; no host code in console bundle |

---

## Cross-cutting requirements (every phase)

1. [validation-policy.md](../engineering/validation-policy.md) — domain + API + tests.
2. [api-validation-audit.md](../engineering/api-validation-audit.md) — update rows for touched routes.
3. Same Application Services as agents; no console-only business rules.
4. `npm run check` must pass before merge.

## Parallel track: production identity (from v0.8)

Continue ADR-0019 items not blocked by console work:

- Production bootstrap ceremony
- Session audit linkage
- Agent OAuth/MCP credentials separate from human sessions
- Cloudflare Access as optional outer gate

Console phases **must not** weaken CSRF, step-up, or fail-closed auth.

## Definition of done for v0.9 milestone

**Achieved.** Console phases C1–C5 are implemented in `apps/admin-web` with supporting API (`approval-inbox`, pending custom approvals, pagination bounds). Further polish (design system, full plugin admin extensions, block editor parity with BurgerEditor) is v1.0+.

## v1.0 mandatory track: one-click Cloudflare deploy

Authority: [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md), [product requirements v0.4](../requirements/product-requirements-v0.4.md) DEPLOY-001–003.

| Deliverable | Acceptance |
|-------------|------------|
| Single-flow provisioning | Operator with a Cloudflare account can deploy API worker, public renderer, D1, R2 bindings, and admin console without manual Wrangler steps as the **documented production path** |
| Bootstrap in flow | First owner Passkey registration and site/workspace bootstrap complete inside the same flow |
| Secrets & config | Required secrets and hostnames are collected or generated by the flow; no undefined manual env checklist |
| Post-deploy | Operator lands in `/console/` authenticated and can manage the content tree |

This track **outranks** new CMS feature surface until DEPLOY-001–003 are met. Local `npm run dev:stack` remains a developer aid, not the product onboarding story.

## Quality track (post-console, parallel)

Console phases C1–C5 are done. Further **public HTML, crawler discovery, structured-document accessibility, and mobile console operability** are defined in [quality-track-implementation-plan.md](quality-track-implementation-plan.md). That track intentionally **does not** include search projection, `llms.txt`, or deploy-path changes. Priority: typed SEO → sitemap/robots → block v2 + 422 → mobile shell + keyboard tree.

## Suggested execution order

1. C1 UI kit + state badges + block editor minimum
2. P0 validation backlog (slug HTTP tests, pagination bounds) per api-validation-audit
3. C2 tree create/move/trash
4. C3 media nav + picker
5. C4 inbox
6. Quality track Waves 1–4 per quality-track-implementation-plan.md (after or parallel to v1.0 deploy when not conflicting)
