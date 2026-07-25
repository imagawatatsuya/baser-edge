# ADR-0019: Human authentication, sessions, and step-up

- Status: Accepted
- Date: 2026-07-25

## Context

v0.8 authenticated API requests with development-only principal headers. That model cannot protect production administration, Plugin or Theme activation, sensitive mail submissions, or publication operations.

baserCMS principals remain the authorization subject. Human login must not collapse into agent identity, and Cloudflare Access must not replace CMS capability checks.

## Decision

1. Separate **Authentication Identity** (`auth_identities`, passkeys) from **Human Principal** (`principals`).
2. Use **WebAuthn / Passkey** for human registration and login via `@simplewebauthn/server` (no custom cryptography).
3. Issue **server-side sessions** stored in D1 or memory; expose them as `HttpOnly` `baser_session` cookies with a separate `baser_csrf` double-submit token.
4. Require **CSRF** validation for cookie-authenticated mutating requests.
5. Require **step-up WebAuthn** for high-risk operations when the actor is session-authenticated:
   - Theme release activation
   - Plugin release activation
   - Raw PII mail submission reads
   - All-session revocation
   - Content and custom-entry publication
6. Treat **Cloudflare Access** as an optional outer reachability gate (`CF_ACCESS_REQUIRED`); it does not grant CMS capabilities.
7. **Reject development principal headers** when `BASER_ENV=production`.
8. Disable open bootstrap in production unless `BASER_ALLOW_BOOTSTRAP=true`.

Agents never receive human authentication identities. Capability, delegation, approval, and audit flows remain unchanged; step-up is enforced through `CmsSecurityHooks` after capability evaluation succeeds.

## Consequences

- Admin clients can use cookie sessions in browsers while tests and local tooling may continue using development headers outside production.
- Production deployments must configure RP ID, origin, secure cookies, and optional Access before exposing the API publicly.
- Step-up is tied to session authentication; development header actors are not required to step up, preserving existing automated tests.
