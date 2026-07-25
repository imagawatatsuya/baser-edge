# ADR-0021: baserEdge product identity, mandatory deploy UX, and no host-side migration

**Reader note:** Product boundaries for baserEdge—not a judgment of baserCMS. Public summary: [relationship-to-basercms.md](../compatibility/relationship-to-basercms.md).

- Status: Accepted
- Date: 2026-07-25
- Supersedes in part: [ADR-0011](./0011-basercms-is-product-emdash-is-infrastructure-reference.md) (product “source of truth” and migration-first priority)

## Context

The repository began as a baserCMS-oriented reimplementation on Cloudflare. That framing helped align Content Tree semantics and terminology. It also implied baserCMS 5 compatibility, database importers, and migration tooling as product obligations—constraints that compete with a clean Cloudflare-native product.

The shipping product is **baserEdge**: a CMS optimized for Cloudflare, not a PHP runtime port, not a baserCMS 5 bundle, and not a WordPress- or Collection-first generic CMS.

Operators must reach a working admin console without manual Wrangler ceremony. **One-click deploy and initial provisioning are mandatory product goals**, not optional infrastructure polish.

## Decision

1. **Product name and authority:** **baserEdge** is the product. Specifications, APIs, persistence shapes, Theme/Plugin contracts, and distribution artifacts are authoritative on the baserEdge side.

2. **Operational model, not runtime inheritance:** Site-tree Content Manager semantics (Folder, Page, Alias, Blog, Mail Form, Custom Content on one tree; content identity separate from route) remain product structure. That model is **inspired by baserCMS-style operations**, not a commitment to run, ship, or depend on baserCMS 5.

3. **No backward compatibility obligation:** baserEdge does **not** target baserCMS 5 data, URL, ID, theme, or plugin compatibility. Features whose only justification is “match legacy baserCMS” are out of scope unless they also serve baserEdge operators with no legacy system.

4. **Migration boundary:** If data or assets move from baserCMS into baserEdge, that is addressed **outside core product scope**—for example by baserCMS or third-party tooling that targets baserEdge’s **published contracts**. Core baserEdge does not ship database importers or compatibility shims as a product requirement.

5. **Mandatory deploy experience:** Production onboarding is: Cloudflare account → **one-click (or equivalent single-flow) deploy and bootstrap** → administration. Hand-maintained Wrangler workflows are development aids, not the final customer path.

6. **References vs product:** EmDash and BurgerEditor remain **optional references** for mechanisms (Revision, Manifest, editing patterns). Static baserCMS theme/plugin diagnostics are **engineering aids for understanding legacy artifacts**, not product migration pipelines. See [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

7. **Invariants unchanged:** [AGENTS.md](../../AGENTS.md) non-negotiables (immutable releases, agent publish denial, plugin manifest ≠ grant, validation domain → API → admin) remain binding.

## Consequences

- Product requirements and roadmaps prioritize **deploy UX** and **tree-centric CMS** over importer milestones.
- ADR-0011’s “baserCMS as product source of truth” applies only to **vocabulary and operational patterns**, superseded by this ADR for compatibility and migration.
- Removing migration scope may delete or freeze docs/tools that promised baserCMS DB/theme/plugin conversion as product features; diagnostics may remain as non-product utilities.
- baserCMS project may choose to export to baserEdge formats; that is external to baserEdge’s backlog.

## Related documents

- [Product requirements v0.4](../requirements/product-requirements-v0.4.md)
- [Operational model](../compatibility/basercms-invariants.md) (baserEdge tree semantics; not migration checklist)

## Repository identifiers

- Product name: **baserEdge**
- Monorepo npm root: `baser-edge`; workspace scope: `@baser-edge/*` (replaces `@baser-cloud/*`).
