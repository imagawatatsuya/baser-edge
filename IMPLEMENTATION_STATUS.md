# Implementation status — baserEdge v0.9

Product definition: [requirements v0.4](docs/requirements/product-requirements-v0.4.md). **One-click deploy:** `npm run provision:cloudflare` + `npm run deploy:cloudflare` ([guide](docs/deployment/baseredge-cloudflare.md)). Dashboard “single button” UX is v1.0+ polish on this flow.

v0.9 adds production-oriented human authentication while preserving v0.8 Plugin boundaries and the rule that CMS authorization remains capability-based on Human/Agent principals.

## Milestone identity (v0.9)

## Implemented in v0.9

### Authentication domain

- Authentication Identity separated from Human Principal
- Passkey/WebAuthn registration and login (`@simplewebauthn/server`)
- Server-side session store (Memory + D1)
- Secure `HttpOnly` `SameSite=Lax` session cookies (Secure in production)
- CSRF double-submit protection for cookie-authenticated mutations
- Session list, single revoke, logout, and all-session revoke
- WebAuthn step-up for high-risk operations under cookie sessions
- Optional Cloudflare Access outer gate (not CMS authorization)
- Production rejection of development principal headers
- Production bootstrap disabled unless explicitly allowed

### Integration

- `CmsSecurityHooks.assertStepUp` wired after successful capability evaluation
- Existing Capability, Delegation, Approval, Audit, and Agent publish denial unchanged
- Development principal headers still supported outside production for tests and local tooling

## Automated verification

- **67 Node test cases pass.**
- **68 tables/views** across **9 D1 migrations**.
- Auth tests cover Memory + D1 stores, CSRF, production header denial, and Theme activation step-up.

## Security posture (v0.9)

### Enforced now

- Session tokens stored hashed server-side; cookies carry opaque tokens only
- CSRF required for cookie session mutations
- Step-up required for configured high-risk actions when `authenticationMethod=session`
- Human-only passkey registration; agents cannot obtain human auth identities
- `BASER_ENV=production` blocks `x-baser-principal-*` headers

### Still requires production infrastructure

- Real browser WebAuthn relying party deployment (`BASER_AUTH_RP_ID`, `BASER_AUTH_ORIGIN`, `BASER_WEBAUTHN_GATEWAY=simple`)
- Cloudflare Access JWT signature verification (current gate checks presence/identity headers only)
- Agent OAuth/MCP credentials separate from human sessions
- Rate limiting and session anomaly detection

## Carried forward from v0.8

Plugin kernel, Theme kernel, Content Manager, Mail Form, diagnostics, and sandbox Plugin runtime boundaries remain as documented in v0.8.
