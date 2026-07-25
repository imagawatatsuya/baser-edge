# ADR-0017: Site themes activate immutable ThemeReleases composed from Token and Layout revisions

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS treats Theme as a standard Site-level concern, but its PHP template/filesystem model permits live mutation and arbitrary execution. A direct port would conflict with Cloudflare deployment, exact Preview, AI governance and rollback requirements.

Using only an Astro project as the Theme source would also weaken the baserCMS migration goal by making the CMS an attachment to one frontend framework.

## Decision

1. Theme remains a Workspace object that can be activated for a Site.
2. visual settings are immutable DesignTokenRevisions.
3. shell/layout settings are immutable LayoutRevisions.
4. a ThemeRelease binds exact Token and Layout revisions plus a validated Manifest.
5. a Site activation appends history rather than editing a Theme in place.
6. only a Human principal can activate a Release.
7. public rendering resolves the current Site activation.
8. PreviewSession stores and resolves an exact ThemeRelease ID.
9. existing baserCMS PHP themes are statically diagnosed and converted; they are never executed by the new runtime.
10. v0.7 permits bounded static CSS but no Theme JavaScript.

## Consequences

### Positive

- Preview and approval are reproducible.
- rollback can later select a prior Release without reconstructing files.
- AI can propose visual changes without silently changing production.
- baserCMS Site/Theme semantics survive the runtime rewrite.
- renderer frameworks can evolve behind a stable Theme domain contract.
- D1 can enforce immutability independently of API behavior.

### Negative

- every visual edit creates additional immutable records.
- current Theme management requires API calls because the visual editor is not implemented.
- PHP templates need conversion rather than direct execution.
- CSS-only extension is less flexible than arbitrary theme JavaScript.
- asset build and component compatibility require later manifests.

## Rejected alternatives

### Mutable Theme settings row

Rejected because an old Preview or approval could change after it was reviewed.

### Copy baserCMS PHP themes to Workers

Rejected because PHP execution, filesystem mutation and arbitrary helper/plugin calls do not fit the Cloudflare security/runtime model.

### Make Astro configuration the source of truth

Rejected because this is a baserCMS port and must keep a CMS-owned Site/Theme model that can support more than one frontend implementation.

### Allow Agents to activate Themes

Rejected as the default because Theme activation can change every public page and is a high-risk deployment action.
