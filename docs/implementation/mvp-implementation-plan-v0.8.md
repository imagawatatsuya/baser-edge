# MVP implementation plan v0.8

## Completed in this milestone

- Plugin identity and trust classification
- immutable PluginRelease and release hash
- declarative Manifest validation
- explicit Capability and Host consent
- Human-only activation and deactivation
- Workspace/Site activation history
- invocation audit records
- Trusted host handler registry
- Workers for Platforms sandbox adapter
- host CPU/subrequest limits and response bound
- fail-closed Outbound Worker requirement for network plugins
- Content before/after publish hooks
- capability-gated admin extension metadata and API routes
- request/response header sanitization
- Plugin API, D1 Store and Migration
- administration identity/list prototype
- static baserCMS Plugin migration diagnostics
- BurgerEditor diagnostic fixture/report
- automated Memory, D1, API, runtime and diagnostic tests

## Next milestone: production identity and high-risk operation authentication

The current local API uses development principal headers. Before treating Plugin activation, Theme activation, PII access or publication as production-ready, implement:

- WebAuthn/Passkey registration and authentication
- secure server-side Session with rotation and revocation
- Cloudflare Access as an outer administrative boundary, not the CMS authorization model
- Step-up authentication for Plugin/Theme activation, raw PII access and critical publication
- CSRF/origin protection for browser administration
- device and recovery credential management
- Session/audit linkage and suspicious-session revocation
- Agent OAuth/MCP client credentials separated from Human sessions
- production bootstrap and first-owner ceremony
- mobile-friendly reauthentication and approval flow

## Plugin follow-up before v1.0

- real Workers for Platforms deployment and bundle uploader
- mandatory Outbound Worker allowlist enforcement
- signed package registry, SBOM and provenance
- vulnerability and malware scanning
- Plugin storage namespaces and quotas
- Mail/Theme lifecycle wiring
- Component/Content Type registry integration
- dynamic admin UI isolation
- release approval, staged activation, rollback and upgrade planner
- baserCMS plugin conversion fixtures and compatibility tests
