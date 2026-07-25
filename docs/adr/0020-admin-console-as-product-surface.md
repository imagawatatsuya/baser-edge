# ADR-0020: Admin console as a first-class product surface

- Status: Accepted
- Date: 2026-07-25

## Context

The Content Kernel, Blog, Custom Content, Mail Form, Theme, Asset, Plugin, and Auth APIs are substantially implemented and tested. Human administration runs through `apps/admin-web`, but that application is still a **golden-path probe**: title/body text fields, a read-only tree with limited navigation, no media, no block editor, no approval inbox, and workflow semantics (save vs publish, revision locks) exposed raw to operators.

Operators compare the console to baserCMS or modern SaaS CMS products and correctly perceive a **1990s HTML form** experience. That gap is not accidental: [ADR-0011](./0011-basercms-is-product-emdash-is-infrastructure-reference.md) prioritized domain correctness and [MVP v0.8](../implementation/mvp-implementation-plan-v0.8.md) prioritized Plugin runtime and identity hardening. The console was never declared complete.

Product requirements ([v0.4](../requirements/product-requirements-v0.4.md)) require **Mobile Operations First**, **mandatory one-click Cloudflare deploy** (DEPLOY-001–003), and mobile Asset/Preview flows that the current UI does not fully satisfy. Continuing to add API features without a console milestone will deepen the “thick backend, absent product” failure mode.

## Decision

1. **`apps/admin-web` is the canonical Human administration UI** for baserEdge. Legacy `apps/admin` static prototypes are not product targets; new operator features land in admin-web unless explicitly scoped to CLI/MCP only.

2. **The site tree is the primary management surface** in the console, matching baserCMS Content Manager semantics. List-and-form demos that bypass tree placement are acceptable only as temporary scaffolding inside a phased milestone.

3. **Console quality is defined by operator outcomes**, not by API coverage:
   - Create and place content in the tree without knowing internal IDs.
   - Edit canonical **Structured Document** blocks (not a parallel HTML or plain-text source of truth).
   - Understand draft, approval, and published state without reading API errors.
   - Complete approve/publish (or reject) from phone-width layouts where the product requires it.
   - Use the same Application Services as agents; the UI does not invent side channels.

4. **Phased delivery** is mandatory. See [Admin console architecture v0.1](../architecture/admin-console-v0.1.md) and [MVP implementation plan v0.9](../implementation/mvp-implementation-plan-v0.9.md). New `/console/` features must name their phase; work outside the current phase requires ADR amendment or phase promotion.

5. **Phase gates** (all phases):
   - [validation-policy.md](../engineering/validation-policy.md) and [api-validation-audit.md](../engineering/api-validation-audit.md) updated when routes or forms change.
   - Extend `tests/console-golden-path.test.mjs` or add a focused UI contract test when behavior is user-visible.
   - No new operator-facing mutation that is **console-only validated**.

6. **End state for the “wireframe era”**: Phase C1 removes the long-term use of a single `<textarea>` as the canonical body editor for Page and Article. Plain textarea may remain for dev-only fixtures until C1 ships.

7. **EmDash and BurgerEditor** remain references for mechanisms and migration behavior; their licensed or product-specific admin UI is not copied wholesale ([emdash-adoption-matrix.md](../compatibility/emdash-adoption-matrix.md)). Console UX is designed for baserCMS tree + Structured Document + Approval policy.

## Non-goals (console ADR scope)

- Replacing Cloudflare Access or WebAuthn with a custom username/password CMS login.
- Letting agents publish from the default console without the existing Approval path.
- Building a general-purpose page builder unrelated to Structured Document block contracts.

## Consequences

- Engineering must schedule **console phases in parallel with identity/production hardening**, not after all kernels are “done.”
- `ConsoleScopeBanner` and navigation disabled items should reflect **current phase** and link to the implementation plan, not vague “beta” language.
- Feature requests that only add API surface without a console slice should be challenged unless the audience is exclusively agents/CLI.
- When Phase C2+ ships, tree operations must call existing move/copy/trash services (no duplicate tree logic in the client).
