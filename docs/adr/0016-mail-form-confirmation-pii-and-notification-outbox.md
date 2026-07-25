# ADR-0016: Mail Form uses confirmation sessions, separated PII payloads and a notification outbox

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS treats Mail Form as a standard site content rather than an unrelated external form service. The Cloudflare port must preserve that product behavior while addressing replay, spam, PII access, AI prompt injection and unreliable email delivery.

Saving a public POST directly into a generic Custom Entry table would mix editorial content with hostile public input, make retention difficult and couple acceptance to email availability.

## Decision

1. Mail Form is a first-class `mail-form` Content type in the shared site tree.
2. Its input schema references a versioned Custom Table, but submissions use dedicated Mail tables.
3. A successful public submission requires an expiring, signed, one-time Confirmation Session.
4. Submission metadata and raw payload are stored separately.
5. Every Field receives a privacy class and notification inclusion policy.
6. Raw personal/sensitive values are Human-only and opt-in; Agents always receive redacted values.
7. Notification delivery is an Outbox operation after durable acceptance.
8. Turnstile is verified server-side and required forms fail closed when verification is unavailable.
9. Form values are untrusted data and cannot become Agent instructions through this module.

## Consequences

### Positive

- email provider failure does not lose accepted submissions
- PII can be purged without destroying audit metadata
- replay and double submission have an explicit prevention boundary
- Custom Field vocabulary is reused without conflating editorial Entry and public Submission lifecycles
- AI tooling has a conservative default data view
- D1 can enforce core consistency independently of the UI

### Negative

- confirmation rows and payload separation add storage and operational complexity
- automatic Outbox consumption and retention purge require later scheduled infrastructure
- Mail-specific UI cannot be generated solely from the generic Custom Content editor
- exact behavioral compatibility with all baserCMS MailField options requires additional mapping

## Rejected alternatives

### Save submissions as Custom Entries

Rejected because public input has different trust, retention, notification and access requirements.

### Send email before storing a submission

Rejected because transient delivery failure would either lose input or invite unsafe retries.

### Let Agents read raw submissions when delegated

Rejected as a default because form content is an external prompt-injection and PII source. A future specialized workflow may introduce a narrower reviewed capability.

### Skip Turnstile when configuration is missing

Rejected because a security control marked required must not degrade silently.
