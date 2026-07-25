# Admin console architecture v0.1

## Purpose

Define how `apps/admin-web` delivers baserCMS-style **site-tree-first** administration on top of existing Application Services. This document is the product-technical counterpart to [ADR-0020](../adr/0020-admin-console-as-product-surface.md).

## Application boundaries

```text
Browser (/console/)
  -> apps/admin-web (React, Vite)
  -> apps/api-worker (/v1/*, cookie session + CSRF)
  -> Content / Blog / Custom Content / Asset / Auth kernels
Public site
  -> apps/public-renderer (preview + published)
```

The console never embeds arbitrary plugin code in the host bundle. Plugin admin extensions (future) load through capability-gated metadata and isolated surfaces described in plugin architecture v0.8.

## Information architecture

| Area | Primary API | Operator goal |
|------|-------------|---------------|
| コンテンツ | `content-tree`, `content/*` | Browse tree, open editable types, see route |
| メディア | `assets/*` | Upload, pick into document |
| 承認 | `approvals`, `content/*/approvals` | Inbox, decide, publish |
| 設定 | site/theme/plugin (later) | Step-up gated activations |

Navigation reflects areas above. Disabled nav entries are allowed only when the phase document explicitly defers them.

## Editing model

1. **Canonical state** lives in `ContentRevision` / Structured Document on the server.
2. **Working copy** in the browser is a projection: block list or typed fields, not a second schema.
3. **Save** creates a new revision (optimistic lock on `item.lockVersion`).
4. **Publish** is a distinct action: approval when required, then publish endpoint; UI must show published vs working revision.
5. **Preview** uses PreviewSession against the revision the operator expects (working after save, not stale client cache).

Title may be Unicode; slug and public path segments follow `normalizeSlug` (ASCII).

## Site tree UI

- Tree data from `GET /v1/sites/:siteId/content-tree`.
- Node actions (create child, move, copy, trash, restore) call existing CMS services; client shows **move-impact** before destructive tree changes.
- Articles and pages are editable leaves; folders expand; aliases show target indicator (warning when target unpublished — Phase C2).

## Session and security

- Cookie session from [ADR-0019](../adr/0019-human-authentication-sessions-and-step-up.md).
- CSRF on all mutating fetches; prefer cookie token over stale localStorage.
- Step-up flows surface as modal re-auth, not opaque 403 strings.

## UX quality bar (all phases after C0)

- **Layout**: usable at 375px width for flows marked mobile-required in the phase plan.
- **Feedback**: inline field errors; global status for async operations; no silent failure.
- **State**: badges for 下書き / 承認待ち / 公開中; disable publish when preconditions fail with reason.
- **Components**: shared primitives under `apps/admin-web/src/components/` (buttons, modals, banners, tree). Avoid one-off unstyled forms in page files.

## Testing contract

- `tests/console-golden-path.test.mjs` — login → article → revise → approve → publish → public HTML.
- Phase additions extend golden path or add sibling tests (e.g. tree move, asset upload) documented in the implementation plan.

## Relationship to agents

Agents use MCP/CLI against the same APIs. Console-specific affordances (banners, wizards) do not change authorization. Agent proposals appear in approval inbox when Phase C4 includes them.
