# ADR-0015: Custom Content uses immutable value Revisions and typed projections

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS Custom Content is composed of reusable Custom Fields, Custom Tables, field links and Custom Entries. In baserCMS, linked fields become physical database columns. That design provides straightforward SQL access but does not directly provide immutable entry Revisions, approval bound to exact values, or safe AI proposals.

The Cloudflare migration must preserve the baserCMS product model while sharing the same Revision, approval, audit and Agent safety principles used by Page and Article.

## Decision

1. Preserve Custom Field, Custom Table, field-link, Custom Content and Custom Entry as explicit domain entities.
2. Place each Custom Content root in the baserCMS site tree as a first-class `custom-content` Content Item.
3. Store each Custom Entry value set in an immutable `custom_entry_revisions.values_json` record.
4. Record the validating table schema version and a deterministic content hash on every Revision.
5. Maintain `custom_entry_values` as a rebuildable typed projection for indexing and future SQL query planning.
6. Require an approval that matches the exact entry Revision ID and hash before publication.
7. Deny direct Agent publication by default.
8. Allow only additive field attachment in v0.5; require explicit migration workflows for destructive schema changes.
9. Reject generic Custom Content tree copying until module-aware schema and entry duplication is implemented.

## Consequences

- baserCMS terminology and administration flow remain recognizable.
- Custom Entry publication receives the same human-in-the-loop guarantees as Page and Article.
- Historical values are not overwritten when a schema evolves.
- AI tools can inspect field contracts and submit typed values rather than arbitrary HTML.
- D1 search can evolve toward typed projection queries without making those projections authoritative.
- Large Custom Content datasets are not yet optimized because v0.5 filters reconstructed snapshots in the service layer.
- Physical-table compatibility with baserCMS is an import/export concern, not the runtime storage contract.
