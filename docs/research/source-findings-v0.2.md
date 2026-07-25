# Source findings v0.2

## Confirmed from baserCMS

- The active development source is the `baserproject/basercms` monorepo, especially `plugins/baser-core` and core plugins.
- The Content Manager unifies different content types in a site tree.
- Page, Blog, Mail, Custom Content, Uploader, Search and SEO are separated by plugin boundaries.
- URL-centered permission and PHP runtime plugin behavior should not be copied unchanged.

## Confirmed from uploaded BurgerEditor 3.4.0

- The canonical saved value is HTML in existing Page/Blog fields, not a separate JSON document.
- `data-bgb` identifies a block type and `data-bgt` identifies an editable type.
- Type versions are stored in HTML.
- Main and draft are separate HTML fields.
- Image references are paths rather than stable Asset IDs.
- External plugins can add PHP-based blocks/types.
- Unknown data must be preserved during migration.

## Confirmed from EmDash public repository/documentation

- EmDash is a TypeScript/Astro CMS monorepo with core, admin, auth, blocks and Cloudflare packages.
- It supports D1/R2 and portable alternatives, structured content, revisions, passkeys, MCP/CLI and sandboxed plugin execution.
- It is a strong generic implementation reference but its Collection/Astro orientation is not the baserCMS product model.

## v0.2 code provenance

No baserCMS, BurgerEditor or EmDash source file is copied into v0.2. The implementation is original and uses the projects as behavioral and architectural references.
