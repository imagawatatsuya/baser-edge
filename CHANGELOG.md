# Changelog

## 0.9.0 - 2026-07-25

- Adds `@baser-edge/auth-kernel` with Authentication Identity separation from Human Principal.
- Adds Passkey/WebAuthn registration and login using `@simplewebauthn/server`.
- Adds server-side sessions with `HttpOnly` `baser_session` cookies, `baser_csrf` double-submit CSRF protection, and session list/revoke APIs.
- Adds WebAuthn step-up for Theme/Plugin activation, sensitive mail reads, publication, and all-session revocation when using cookie sessions.
- Rejects development principal headers in production and gates bootstrap behind `BASER_ALLOW_BOOTSTRAP`.
- Treats Cloudflare Access as an optional outer boundary (`CF_ACCESS_REQUIRED`) without replacing CMS capability checks.
- Adds D1 migration `0009_auth.sql`, `D1AuthStore`, and five automated auth tests (67 total tests, 68 tables/views).

## 0.8.0 - 2026-07-25

- Adds Workspace Plugin identity, immutable PluginRelease, scoped Activation and Invocation history.
- Adds declarative Manifest capabilities, lifecycle hooks, API routes, admin pages/widgets, network hosts and storage requests.
- Requires Human principals for Plugin identity, release, activation and deactivation operations.
- Separates first-party Trusted handlers from Workers for Platforms sandbox dispatch.
- Adds host-controlled CPU/subrequest limits and bounded sandbox responses.
- Makes network-enabled sandbox plugins fail closed unless Outbound Worker enforcement is explicitly configured.
- Connects content.beforePublish and content.afterPublish hooks to the Content Kernel.
- Prevents post-commit hooks from declaring blocking failure behavior.
- Adds capability-gated Plugin routes and sanitized request/response headers.
- Adds Plugin API, administration prototype, Memory/D1 stores and immutable-release triggers.
- Adds static baserCMS Plugin diagnostics and a source-grounded BurgerEditor migration report.
- Expands automated verification to 62 tests and 63 tables/views.

## 0.7.0 - 2026-07-25

- Adds Workspace Theme, immutable Design Token Revision, Layout Revision and ThemeRelease domains.
- Preserves baserCMS Site/Theme semantics through explicit Site Theme activation history.
- Restricts Theme activation to Human principals and records activation in Audit.
- Pins PreviewSession rendering to its exact ThemeRelease while public rendering follows the current Site activation.
- Adds Theme-aware Page, Blog, Custom Content and Mail Form rendering with a built-in fallback theme.
- Adds bounded Design Tokens and rejects executable or external constructs in Theme CSS.
- Adds Theme API routes, Memory/D1 stores and D1 immutability triggers.
- Adds a static baserCMS Theme diagnostic tool for helper dependencies, PHP risks, reusable assets and Design Token candidates.
- Updates the demo and local shared stack to use a shared ThemeService.
- Expands automated verification to 49 tests and 59 tables/views.

## 0.6.0 - 2026-07-25

- Adds baserCMS-style Mail Form as a first-class site-tree Content type.
- Reuses Custom Field and Custom Table schemas for versioned public forms.
- Adds server validation, Honeypot, Turnstile boundary, signed Confirmation and one-time Submission.
- Separates Submission metadata from PII payload and adds per-field privacy policy.
- Masks personal and sensitive values by default and denies raw PII to Agents.
- Adds owner notifications, auto-replies, retryable Notification Outbox and Cloudflare Email binding adapter.
- Adds public input, confirmation and completion rendering with no-store responses.
- Adds mobile Mail Form creation, approval/publication, redacted submission list and Outbox delivery.
- Adds D1 Mail Form tables, atomic Confirmation consumption and integrity triggers.
- Makes Turnstile-required forms fail closed when no verifier secret is configured.
- Expands automated verification to 44 tests and 54 tables/views.

## 0.5.0 - 2026-07-25

- Adds baserCMS-style Custom Field, Custom Table, Custom Content and Custom Entry domains.
- Adds `custom-content` as a first-class site-tree Content type.
- Adds typed field validation, schema versions, required/searchable/unique field links and generated mobile forms.
- Adds immutable Custom Entry Revisions, optimistic conflict checks and exact-hash Approval.
- Denies direct Agent publication of Custom Entries by default.
- Adds public Custom Content listing, keyword and field filters, pagination and detail routes.
- Adds JSON Revision source of truth plus typed D1 projection rows and integrity triggers.
- Adds Custom Content API routes, D1 adapter and site-level schema listing.
- Rejects generic Custom Content copy until module-aware schema and Entry duplication is implemented.
- Rejects non-canonical Base64URL encodings during signed Asset and Preview token verification.
- Expands automated verification to 36 tests and 48 tables/views.

## 0.4.0 - 2026-07-25

- Adds baserCMS-style Blog and Article content types to the shared site tree.
- Enforces Folder → Blog → Article parent relationships in Memory and D1 stores.
- Adds Blog collection settings, hierarchical Categories, Tags and Revision-bound classification.
- Adds public Article listing, Category/Tag filtering and RSS 2.0 projection.
- Adds Blog/Article/Taxonomy API routes and mobile Blog creation prototype.
- Adds the fourth D1 migration with Blog metadata and integrity triggers.
- Rejects generic Blog/Article copy and cross-Blog moves until module-aware duplication is implemented.
- Expands automated verification to 31 tests and 40 tables/views.

## 0.3.0 - 2026-07-25

- Adds Asset and UploadSession kernels with signed, expiring, one-time upload URLs.
- Adds Memory and R2-compatible Object Store implementations and D1 Asset metadata persistence.
- Adds Asset reference extraction from Structured Documents and published-use deletion protection.
- Adds public Asset GET/HEAD responses with ETag and immutable cache headers.
- Adds persisted, revocable PreviewSessions pinned to Revision ID, Revision hash and Theme Release.
- Adds signed preview tokens and same-renderer unpublished Revision previews.
- Adds Media and Preview operations to the mobile admin prototype.
- Adds shared-memory local API/Public/Preview/Asset development stack.
- Adds the third D1 migration and expands verification to 25 tests and 35 tables/views.

## 0.2.0 - 2026-07-25

- Adds baserCMS-style Folder and Alias content types.
- Enforces that only Folder nodes may contain child content.
- Adds recursive Content Tree copy with independent unpublished copies.
- Adds subtree Trash and Restore with original location metadata and conflict checks.
- Adds relocation impact reports for descendants and URL changes.
- Adds old-path 301 Redirects that follow the latest active route and avoid loops when paths are reclaimed.
- Adds Content Tree and Trash APIs.
- Adds API-backed mobile tree/trash outline prototype.
- Adds D1 alias/trash migration and parity with the in-memory Content Manager store.
- Adds Public Renderer redirect verification.
- Expands automated verification to 18 tests and 33 tables/views across 2 migrations.

## 0.1.0 - 2026-07-24

- Adds baserCMS-first monorepo foundation.
- Adds typed Structured Document and Component Registry.
- Adds immutable Revision, Capability, Delegation, Approval and Publication flow.
- Denies direct Agent publication by default.
- Adds in-memory and D1 stores with database-enforced revision/publication invariants.
- Adds API Worker, Public Renderer, mobile operations prototype and BurgerEditor importer.
- Adds initial automated tests.
