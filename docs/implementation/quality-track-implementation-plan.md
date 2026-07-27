# Quality track implementation plan

Authority: [AGENTS.md](../../AGENTS.md), [ADR-0020](../adr/0020-admin-console-as-product-surface.md) (cross-cutting console quality), [validation-policy.md](../engineering/validation-policy.md).

**Purpose:** Raise **public HTML correctness**, **operator usability on phones**, and **structured-content accessibility** without touching Cloudflare provisioning, wrangler deploy paths, or Agent publish policy.

**Outranks:** Cosmetic admin redesign, `llms.txt`, RUM, search projection workers, and multi-toggle AI bot policy UI.

**Does not outrank:** [v1.0 one-click deploy track](mvp-implementation-plan-v0.9.md#v10-mandatory-track-one-click-cloudflare-deploy) when that work is actively in flight—quality PRs must not expand deploy surface.

---

## What we optimize for

| Signal | Why it is reliable |
|--------|-------------------|
| Typed, escaped `<head>` metadata | Every indexable page gains title, description, canonical, `lang` without trusting raw HTML |
| Minimal `sitemap.xml` / `robots.txt` | Crawlers discover only published canonical URLs; admin/preview/API stay out |
| Semantic block output (v2) + API 422 on bad props | Problems are blocked at save/revise, not only in the theme |
| v1 render fallback | Immutable revisions keep working; no retroactive invalidation |
| Mobile shell + non-drag tree ops | Real WCAG and ADR-0020 mobile outcomes, same services as DnD |
| Deterministic HTML contract tests | `npm run check` catches regressions without flaky browsers |
| LCP-minded image loading | One-line class of bugs (hero lazy-loaded) removed |

---

## Explicitly cut (do not implement under this track)

| Item | Reason |
|------|--------|
| `llms.txt`, public Markdown mirror | Optional discoverability; normal SEO/SSR/sitemap first |
| RUM / Core Web Vitals collection | Product analytics, not HTML quality |
| D1 FTS5 / SearchDocument / sitemap **projection** workers | Archived Milestone 8; renderer-generated sitemap is the interim approach (see below) |
| Site-owner UI for four bot-policy dimensions | No settings model yet; ship safe `robots.txt` defaults only |
| Playwright + axe in default `npm run check` | High flake/debt risk; optional script later if needed |
| axe on full console + onboarding in P0 | Too much legacy UI debt; scope public canonical pages first |
| External LLM alt-text or SEO copy | Deterministic rules only; proposals via Agent stay P-later |
| `srcset` / format variants without a generator | Contract without infra creates false confidence |
| WCAG 2.2 AA “certification” wording | Incremental gates; document target, not claim completion |
| Importing cursor-pack root prompts (`CURSOR_MASTER_PROMPT.md`) | Process noise; this doc is the source of truth |
| Publish-time rewrite of immutable published revisions | Diagnostics + v2 validation on edit paths only |

---

## Interim sitemap vs future projection

**Now:** `apps/public-renderer` generates `/sitemap.xml` from live CMS reads (canonical, active, published, non-trashed routes). Acceptable for trial/small sites.

**Later:** When Search/Sitemap projection lands (archived [MVP v0.1 Milestone 8](../archive/implementation/mvp-implementation-plan-v0.1.md)), switch the route to projection output or dual-write. Quality track PRs must not block that migration—keep generation logic in a small module with a single call site.

---

## Execution waves (priority order)

Each wave is one or two PRs, `npm run check` green, audit rows updated when routes/forms change.

### Wave 1 — Typed head metadata + LCP micro-fix (P0)

**Goal:** Indexable pages expose complete, safe metadata; hero image is not lazy-loaded.

**Deliverables**

1. `packages/renderer`: extend shell rendering with typed SEO (title, description, canonical URL, robots meta, `og:*`, Twitter card, safe JSON-LD `WebPage` aligned with visible title and dates).
2. Keep `headHtml` for RSS link etc.; do not require editors to supply SEO HTML.
3. `apps/public-renderer`: pass public origin, route path, revision timestamps, preview flag (preview: `noindex` in HTML **and** keep existing `x-robots-tag` / `no-store`).
4. Default description: trimmed excerpt from structured body or site name when `fields.seo` absent (no DB migration in Wave 1).
5. Renderer: `starter-home-hero` / first visible image block — `loading="eager"` (or omit lazy); keep lazy for other images until Wave 4.

**Tests**

- Escape quotes/HTML in description; JSON-LD cannot break `</script>`.
- Preview HTML contains `noindex`.
- Canonical is absolute and matches resolved route.

**Not in Wave 1:** Admin SEO fields, `fields.seo` persistence validation (Wave 2).

---

### Wave 2 — Public discovery files (P0)

**Goal:** Crawlers get deterministic `robots.txt` and `sitemap.xml`.

**Deliverables**

1. `robots.txt`: allow public content; disallow `/console/`, `/api/`, `/_preview/`, mail confirm/complete paths; `Sitemap:` absolute URL; **single default policy** (no per-bot UI).
2. `sitemap.xml`: only active site, canonical routes, published revision, not trashed; exclude aliases, redirects as entries, drafts, forms lifecycle URLs; `lastmod` from revision timestamps.
3. Canonical duplication: list `/home` (or the single indexable home URL per product contract); do not list both `/` and `/home` when root redirects.

**Tests**

- Matrix rows: published included; alias/draft/form excluded.
- `HEAD` support where other public routes support it.

**Audit:** public-renderer routes row in [api-validation-audit.md](../engineering/api-validation-audit.md) if new paths are added.

---

### Wave 3 — Accessible blocks v2 + domain gates (P0)

**Goal:** New edits cannot ship broken semantics; old content still renders.

**Deliverables**

1. `packages/structured-document`: register **componentVersion 2** for `image`, `imageText`, `gallery`, `table`, `safeEmbed` (v1 definitions unchanged).
2. v2 props (minimal):
   - Image / imageText / gallery item: `decorative`, `alt` when non-decorative, optional `caption`.
   - Table: `caption`, column headers, rows; optional row-header column.
   - Embed: `title` (required), existing provider URL allow-list unchanged.
3. Domain/kernel validation on block revise/create → `DomainError` stable codes → API 422.
4. Renderer: branch on `componentVersion`; v1 paths unchanged (gallery empty alt, etc.).
5. `collectAssetReferences` updated for gallery v2 item shapes.
6. `apps/admin-web`: block editor fields for v2; **new blocks default to v2**; v1 blocks editable without forced upgrade.
7. `runDocumentDiagnostics(document)` (structured-document or shared kernel): stable `QualityIssue` codes; **warnings** for v1 blocks; not used to block publish in Wave 3—blocking is via 422 on invalid v2 props.

**Tests**

- Per surface: success + ≥2 rejections (decorative image, missing alt, missing embed title, table without caption/headers).
- v1 published document still renders in renderer test.

**Not in Wave 3:** Blocking publish approval on document-level heading jumps (diagnostic only in UI banner later).

---

### Wave 4 — Mobile console + keyboard tree (P0)

**Goal:** 320 CSS px operability without horizontal page scroll; tree moves without pointer.

**Deliverables**

1. `apps/admin-web` shell: off-canvas drawer (preferred) or stacked nav; `aria-expanded`, `aria-controls`, focus trap, Escape, focus return; `aria-current="page"`.
2. Save / preview / approval remain visible on narrow widths (wrap or bottom action region).
3. Tree: move up, move down, move to parent (or folder picker) using **same** `reorderContentInTree` / move services as DnD; polite live region on success.
4. Touch targets ≥24×24 CSS px minimum; ~44px for primary actions where practical.

**Tests**

- Extend `tests/console-golden-path.test.mjs` for keyboard tree move (or focused integration test).
- Extend `tests/console-mutation-sync-ui.test.mjs` if tree mutation touches multiple views.

**Not in Wave 4:** Full form error-summary / `aria-describedby` (P1 polish).

---

### Wave 5 — Optional SEO fields + publish diagnostics UI (P1)

**Goal:** Operators can override defaults; see document-quality warnings before publish.

**Deliverables**

1. Namespaced `fields.seo` on revisions (title override, description, robots flags enums) with domain validation.
2. Admin SEO section on page/article (after API exists).
3. Surface `runDocumentDiagnostics` in content edit toolbar (warnings; v1 heading jumps, empty CTA labels).
4. api-validation-audit rows for revise routes.

**Cut if time-constrained:** SEO UI can ship after API-only overrides used by tests.

---

### Wave 6 — Optional browser quality script (P1)

**Goal:** Supplement contract tests without blocking CI.

**Deliverables**

- `npm run test:quality:browser` (Playwright): **only** public `/home` + one blog/article at 320px and 1440px; optional axe with critical/serious budget documented in script output.
- Not added to `npm run check`.

---

### Wave 7 — Agent-facing diagnostics (P2)

**Goal:** Same deterministic issues as Wave 3 diagnostics, exposed for Agent runs → ChangeSet proposals; no direct publish.

**Deliverables**

- Read-only diagnostic endpoint or reuse kernel from approval flow.
- Map issues to block operations; audit trail unchanged.

**Cut until Waves 1–4 ship.**

---

## PR checklist (every wave)

1. Domain validation before API/UI.
2. [api-validation-audit.md](../engineering/api-validation-audit.md) / [console-mutation-sync-audit.md](../engineering/console-mutation-sync-audit.md) when applicable.
3. `npm run check`.
4. No edits to `scripts/cloudflare/deploy.mjs`, wrangler trial/public configs, or provisioning unless explicitly required (expected: none).

---

## Definition of done (track)

- [ ] Public canonical pages: one title, description, canonical, `lang`, OG/Twitter, safe JSON-LD.
- [ ] Preview/draft: noindex + no-store (headers + meta).
- [ ] `sitemap.xml` / `robots.txt` live on public worker.
- [ ] New v2 blocks cannot be saved with missing required a11y fields (422).
- [ ] v1 content still renders.
- [ ] Console usable at 320px without page-level horizontal overflow; tree movable without drag.
- [ ] Hero/starter image not lazy-loaded by default.
- [ ] One-click deploy path unchanged; `npm run prove:local` still valid.

---

## Suggested PR sequence

| PR | Wave | Title (short) |
|----|------|----------------|
| 1 | 1 | Typed SEO shell + escape tests + hero eager |
| 2 | 2 | robots.txt + sitemap.xml |
| 3 | 3a | structured-document v2 + kernel 422 |
| 4 | 3b | renderer v2 output + admin editor v2 |
| 5 | 4 | Mobile drawer + keyboard tree + console tests |
| 6+ | 5–7 | SEO fields UI, optional browser script, Agent diagnostics |

Start implementation with **PR 1**; do not batch Waves 1–4 into a single change set.
