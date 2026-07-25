# MVP implementation plan v0.6

## Completed in this milestone

- `mail-form` as a first-class site-tree Content type
- Custom Table-backed form schema
- published-form requirement
- public input, confirmation and completion rendering
- server-side typed validation and Honeypot
- Turnstile Siteverify adapter and fail-closed configuration
- signed, expiring and one-time Confirmation Session
- immutable Submission metadata and separate PII payload
- per-field privacy and notification policies
- Human-only sensitive reads and Agent-always-redacted views
- owner notification and auto-reply Outbox
- Cloudflare Email binding adapter
- retry/backoff and aggregate delivery state
- payload purge operation
- Memory and D1 stores
- API routes and mobile operations prototype
- D1 integrity triggers and automated tests

## Next milestone: Theme Release and baserCMS theme compatibility

Implement the minimum theme architecture needed to stop treating the renderer as a fixed built-in template:

- immutable Theme and ThemeRelease records
- Site-to-ThemeRelease activation
- Design Token revision
- layout/region contracts for Page, Blog, Custom Content and Mail Form
- Theme manifest and Component compatibility validation
- signed preview pinned to ThemeRelease
- safe static Theme asset delivery from R2 or Worker assets
- baserCMS theme inventory and migration report
- initial PHP-template-to-Astro/TSX conversion assistant boundary

The product remains a baserCMS port. Astro or EmDash-derived techniques may be adopted in the generic renderer/build layer, but the theme model must preserve baserCMS Site/Theme semantics and migration paths.

## Mail Form follow-up before v1.0

- baserCMS MailField compatibility matrix
- Mail-specific field editor and templates
- automatic Queue/Cron notification consumer
- retention purge Workflow
- distributed rate limit and spam score
- attachment quarantine pipeline
- submission search/export and incident audit views
- module-aware copy/trash/restore
- baserCMS database and template importer
- production Cloudflare Email Service and Turnstile verification
