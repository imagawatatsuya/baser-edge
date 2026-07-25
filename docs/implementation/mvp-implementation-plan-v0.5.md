# MVP implementation plan v0.5

## Completed in this milestone

- `custom-content` as a first-class site-tree Content type
- reusable Custom Field definitions
- content and master Custom Table definitions
- additive field linking and schema-version increments
- typed field validation and unique constraints
- immutable Custom Entry Revisions
- optimistic conflict detection
- entry approval fixed to Revision ID and hash
- default denial of Agent direct publication
- published-only list and detail projections
- keyword and field-filter query contracts
- Memory and D1 stores
- typed `custom_entry_values` projection rows
- API routes and generated mobile form prototype
- D1 integrity triggers and automated tests

## Next milestone: Mail Form

Custom Field contracts now provide the schema vocabulary needed by baserCMS Mail Form migration.

Implement:

- Mail Form as a site-tree Content type
- versioned Form Schema using compatible field contracts
- public submission endpoint with Turnstile integration boundary
- immutable submission records separate from notification delivery
- PII classification and Agent-safe views
- notification templates and delivery Outbox
- confirmation and completion pages
- spam, rate-limit and prompt-injection boundaries

## Custom Content follow-up before v1.0

- master entry CRUD and hierarchy
- relation fields and lookup widgets
- field rename, detach, reorder and type migration workflow
- D1 typed-projection query planner
- module-aware copy, export and import
- entry trash, restore, scheduling and expiration
- complete mobile schema and entry editors
- baserCMS database migration mapping
