# MVP implementation plan v0.7

## Completed in this milestone

- Theme domain under Workspace
- immutable Design Token Revision
- immutable Layout Revision
- immutable ThemeRelease manifest and release hash
- Human-only Site Theme activation and activation history
- public active-theme resolution
- Preview exact-theme resolution
- Theme-aware shared Renderer and built-in fallback
- bounded safe Theme CSS
- Theme API, Memory Store and D1 Store
- D1 ownership and immutability triggers
- shared local-stack ThemeService
- demo Theme creation and activation
- static baserCMS Theme migration diagnostics
- automated tests for API, D1, public/preview resolution and diagnostics

## Next milestone: Plugin SDK and baserCMS plugin compatibility boundary

Implement the minimum extension model without restoring arbitrary in-process PHP plugins:

- Plugin Manifest and versioned package identity
- declared Capabilities and requested scopes
- trusted platform module versus isolated extension classification
- lifecycle hooks exposed through typed events
- admin page, dashboard widget and API-route extension points
- Content Type and Component registration contracts
- immutable PluginRelease and Site activation history
- plugin data namespace/migration contract
- audit for install, enable, disable and capability grants
- baserCMS plugin static diagnostic tool
- compatibility report for Controller, Model/Table, Helper, Event and config usage
- initial conversion assistant boundary

EmDash plugin manifest and isolate ideas may be adopted in the generic runtime, but the module vocabulary and migration target remain based on baserCMS core plugins.

## Theme follow-up before v1.0

- visual Token/Layout editor
- Menu Kernel and navigation rendering
- regions/widgets and shared blocks
- immutable Theme Asset bundle in R2 or Workers Assets
- build provenance, CSP hashes and integrity manifest
- Release approval, scheduled activation, staged rollout and rollback UI
- component compatibility validation
- production Cloudflare deployment verification
- baserCMS Theme conversion fixtures and regression screenshots
