# Third-party references

## @simplewebauthn/server

- Package: `@simplewebauthn/server` (dependency of `@baser-edge/auth-kernel`)
- License: MIT
- Role: WebAuthn registration, authentication, and step-up verification
- Used via `SimpleWebAuthnGateway`; automated tests default to `TestWebAuthnGateway` unless `BASER_WEBAUTHN_GATEWAY=simple`.

## baserCMS

- Repository: `baserproject/basercms`
- Role: optional **operational vocabulary and legacy artifact** reference; not a product specification or migration target for baserEdge
- Code is not vendored in this repository.
- Any future data path from baserCMS into baserEdge is **outside this repository** (baserCMS or third parties adapt to baserEdge contracts).

## EmDash

- Repository: `emdash-cms/emdash`
- License: MIT
- Role: architectural and implementation reference for portable CMS infrastructure, manifest capabilities and isolated-plugin concepts
- No EmDash source code is copied into v0.8.

## Cloudflare documentation

- Role: primary reference for D1, R2, Workers, Email, Turnstile and Workers for Platforms adapters
- Documentation concepts and public API shapes are referenced; no Cloudflare product source code is vendored.

## BurgerEditor

- Role: optional editing-behavior reference (not a migration-format obligation for baserEdge)
- Its source distribution has a separate baser market license.
- BurgerEditor source code is not redistributed in this repository.
- Generated diagnostic reports contain paths and findings, not BurgerEditor source text.
