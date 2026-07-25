# ADR-0014: Blog remains site-tree content with a separate collection module

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS treats a Blog as a content item in the Content Manager and manages its Articles, Categories, Tags, listings and feeds beneath it. A generic Collection-first CMS could model Articles independently, but that would weaken baserCMS URL and site-tree compatibility.

## Decision

1. Represent Blog and Article as first-class Content Kernel types.
2. Require Articles to be direct children of a Blog node.
3. Store Blog-specific settings and Article membership in `blog-kernel`.
4. Bind Category and Tag values to immutable Revisions.
5. Generate listing and RSS as public projections of published Revisions.
6. Reject copy and cross-Blog move operations until module-aware metadata migration is implemented.

## Consequences

- The baserCMS site-tree model remains the product source of truth.
- Page and Article share Revision, approval, AI editing, Asset and audit infrastructure.
- Blog-specific features can evolve without duplicating the Content Kernel.
- Module-aware copy/move must coordinate Content and Blog stores before being enabled.
