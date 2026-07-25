# Theme architecture v0.7

## Objective

Preserve the baserCMS relationship in which a Site selects a Theme, while replacing mutable PHP template directories with immutable, reviewable and reproducible ThemeRelease artifacts.

The public Renderer must use the Site's active ThemeRelease. A Preview must use the exact ThemeRelease selected when that PreviewSession was created, so approval does not drift when production appearance changes.

## Domain model

```text
Theme
  Workspace-level identity and migration target

DesignTokenRevision
  immutable visual values
  revision number, JSON, content hash

LayoutRevision
  immutable shell/layout definition
  revision number, JSON, content hash

ThemeRelease
  semantic version
  exact DesignTokenRevision
  exact LayoutRevision
  Renderer API version
  supported Content Types
  bounded static CSS
  migration/build source
  release hash

SiteThemeActivation
  Site -> ThemeRelease history
  one current activation per Site
```

ThemeRelease does not contain mutable pointers. Changing color, layout or CSS creates a new Token/Layout Revision and a new Release.

## Resolution rules

### Public

```text
request route
  -> resolve Site
  -> resolve current SiteThemeActivation
  -> resolve immutable ThemeRelease bundle
  -> render published Content Revision
```

### Preview

```text
signed PreviewSession
  -> verify Content Revision ID and hash
  -> read stored ThemeRelease ID
  -> resolve exact immutable ThemeRelease bundle
  -> render unpublished Revision
```

A later Site activation never changes an existing Preview.

## Renderer contract

The Renderer receives `ResolvedThemePresentation` rather than raw mutable configuration. It builds:

- CSS custom properties from validated Design Tokens
- Site header and footer from Layout Revision
- safe structured-document HTML
- bounded release CSS
- `data-content-revision` and `data-theme-release` provenance attributes

A built-in safe Theme is used if no Site Theme is active. This allows initial bootstrap without hiding missing Theme configuration.

## Security

Theme activation is a high-risk Human-only operation. An Agent may eventually propose Theme artifacts, but cannot make them active.

Release CSS is treated as static styling, not an arbitrary Web extension mechanism. v0.7 rejects:

- `@import`
- external HTTP(S) `url()`
- `javascript:`
- `expression()`
- `</style` breakout
- more than 64 KiB

Theme JavaScript is not supported in this milestone.

## D1 storage

Migration `0007_theme.sql` adds five tables. Triggers validate artifact ownership and abort every UPDATE against ThemeRelease, DesignTokenRevision and LayoutRevision rows. Activation closes the previous active row and appends a new history row.

## baserCMS migration

Existing PHP themes are never executed. The diagnostic tool inventories templates, helpers, CSS, JavaScript and assets and produces an assessment:

```text
reusable as-is after safety checks
requires a baser-domain adapter
requires manual renderer rewrite
blocked by executable/risky code
```

BcBaser/BcContents/BcBlog/BcMail calls should be replaced by typed Site Tree, Blog, Mail and Content queries. Assets and safe CSS can later enter an immutable Theme Asset bundle.

## Known incomplete areas

- Theme Asset manifest and R2/Workers Assets delivery
- Theme build provenance and signing
- navigation/menu and region composition
- visual Token/Layout editor
- Release approval and staged rollout
- automatic template conversion
- plugin-provided Theme components
