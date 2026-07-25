# Input validation policy

This document defines the **minimum validation bar for new features** in baserEdge. UI-only checks or “we will add server validation later” are not acceptable for new work.

## Principles

1. **The domain is authoritative.** Every externally supplied value is validated in kernel or `baser-domain` (or the owning kernel package) before persistence or side effects. HTTP handlers and admin UI must not be the only line of defense.
2. **Fail closed with stable codes.** Reject invalid input with `DomainError` (or equivalent) using a **stable `code`**, HTTP status **422** for correctable client input, **401/403** for authz, **409** for conflicts. Messages may be localized later; **codes are contracts**.
3. **Normalize then validate.** Apply NFC normalization, trimming, and slug/path rules **before** pattern checks (see `normalizeSlug` in `packages/baser-domain`).
4. **UI mirrors the server, it does not replace it.** Admin and future clients should run the **same rules** (shared helpers or duplicated logic with a comment pointing to the server function) so users see errors **before** a round trip when possible.
5. **Every new input surface gets tests.** At least one success path and **two rejection paths** (wrong type, out of range, or policy violation) in `tests/*.test.mjs` or kernel tests. User-visible flows should extend **console golden path** or add a focused test when appropriate.

## Layer model

| Layer | Responsibility | Examples in repo |
|-------|----------------|------------------|
| **Domain** | Invariants, normalization, business rules | `normalizeSlug`, `commitRevision` + `lockVersion`, mail-form size limits |
| **API worker** | Parse JSON, typed fields, call services | `numberField`, `stringField`, `documentField`, `resolveActorContext` |
| **Admin / clients** | Early feedback, accessibility, `pattern` where useful | `apps/admin-web/src/lib/slug.ts` aligned with `normalizeSlug` |
| **DB / triggers** | Integrity that must survive bypass | D1 triggers on publication, preview revision hash |

New features must touch **domain + API** at minimum. Touch **admin** when the feature is exposed in `/console/`.

## Rules by input kind

### Identifiers and slugs (URLs, tree segments)

- **ASCII slug policy (default):** `[a-z0-9]+(?:-[a-z0-9]+)*` after normalization; max length 160. No raw Unicode in path segments unless an ADR explicitly adds IDN/punycode support.
- Reject empty, `.`, `..`, `?`, `#`, `\`, and slashes inside slugs.
- **Titles and labels** may be Unicode; **slugs** may not.

### Revisions and concurrency

- Mutations that depend on document state must send **`expectedLockVersion` from `item.lockVersion`**, not from revision rows.
- Reject stale `baseRevisionId` / `expectedLockVersion` with **409** `REVISION_CONFLICT` (or existing domain code), never silent overwrite.

### Auth and sessions

- Cookie session mutations require **CSRF** double-submit (`baser_csrf` + `x-baser-csrf-token`).
- Do not treat localStorage session metadata as proof of server session; verify with `GET /v1/auth/session` where the UI gate depends on it.

### Structured documents

- Validate against structured document schema / block contracts in the kernel; unknown blocks are preserved, not dropped.
- Do not accept arbitrary HTML as canonical body (HTML is render output).

### Numbers, enums, and bounds

- Use explicit parsers (`numberField`, finite checks); reject `NaN`, wrong types, and out-of-range values.
- Enums must be **closed sets** (reject unknown strings).

### Files and uploads

- Follow asset kernel: MIME, size, signed token, expiry—no ad-hoc upload endpoints without the same guarantees.

## Admin UI checklist (when adding forms)

- [ ] Client validation runs **on submit** (and optionally on blur for high-risk fields).
- [ ] Error text explains **what to enter**, not only “invalid”.
- [ ] Hints distinguish **title (any language)** vs **slug (ASCII)** vs **publish vs save**.
- [ ] Do not open new browser tabs on success unless the user explicitly asked to view; reuse named windows for preview/live when applicable.
- [ ] After adding a flow, consider updating `tests/console-golden-path.test.mjs` or documenting “out of golden path” in the console scope banner.

## Agent implementation checklist (new PR / feature)

Before marking work complete:

1. [ ] Domain function validates all new inputs; throws `DomainError` with stable `code`.
2. [ ] API route uses typed extraction; no `as string` on unvalidated JSON.
3. [ ] Admin (if any) duplicates critical rules or imports shared helpers.
4. [ ] Tests added: happy path + ≥2 failure modes; `npm run check` passes.
5. [ ] No “demo-only” bypass that production could accidentally inherit without `BASER_ENV` / explicit dev flags.
6. [ ] Error messages for 422 are actionable (field name + constraint), not generic “bad request”.

## Anti-patterns (do not ship)

- Accepting slug or path text that the public renderer cannot resolve reliably.
- Validating only in React state without server enforcement.
- Using English-only API errors in admin without mapping common codes to Japanese where the console is user-facing.
- Creating content via API shapes that tests do not cover.
- Hiding “save vs publish” semantics—state must be visible (badges, banners, preview vs live).

## References

- `docs/engineering/api-validation-audit.md` — per-route status and hardening backlog
- `packages/baser-domain/src/index.ts` — `normalizeSlug`, paths
- `apps/api-worker/src/index.ts` — `numberField`, `stringField`, auth
- `tests/console-golden-path.test.mjs` — end-to-end admin contract
- `tests/baser-domain.test.mjs` — slug rejection examples
- `docs/architecture/architecture-overview-v0.3.md` — revision/publication validation at DB boundary
