# Mail Form architecture v0.6

## Objective

Move the baserCMS Mail Form domain to the shared baserEdge Content Kernel without reducing a form to a generic unaudited POST endpoint.

The Mail Form remains a site-tree content with a route, title, publication Revision and Theme-rendered page. Its input schema reuses Custom Field and Custom Table definitions so that field vocabulary is shared with Custom Content while submissions remain an independent security domain.

## Domain model

```text
MailFormDefinition
  contentItemId -> site-tree mail-form Content
  tableId       -> versioned Custom Table schema
  recipients / sender / subjects
  confirmation TTL / retention / Turnstile policy

MailFormFieldPolicy
  Field privacy class
  owner-notification inclusion
  auto-reply inclusion

MailConfirmationSession
  validated temporary values
  schema version and values hash
  client fingerprint hash
  expiry and used-at marker

MailSubmission
  non-payload metadata
  confirmation ID, schema version, payload hash
  receive/purge time and notification state

MailSubmissionPayload
  values stored separately for explicit purge

MailNotification
  owner or auto-reply delivery Outbox row
```

## Public flow

```text
GET form
  -> only a published mail-form Content can render

POST /confirm
  -> accept URL-encoded bodies only and enforce a 256 KiB limit
  -> parse form body
  -> reject Honeypot
  -> verify Turnstile when required
  -> validate against exact Custom Table schema
  -> normalize values
  -> store expiring Confirmation
  -> return signed token and no-store confirmation page

POST /submit
  -> verify canonical signed token
  -> compare form, confirmation, hash and expiry
  -> atomically consume Confirmation
  -> create Submission metadata
  -> create separate PII payload
  -> enqueue owner/auto-reply notifications
  -> return no-store completion page
```

Mail Form configuration validates email headers before creating site-tree content, rejects CR/LF subject injection, and limits a form to 100 fields. Individual string values are limited to 64 KiB and the normalized payload to 256 KiB.

The Confirmation step is not cosmetic. It is the transaction boundary between public validation and durable acceptance. Reusing the same Confirmation is rejected in the service and by D1 integrity rules.

## PII boundary

Field policies classify values as:

- `non-personal`: normal authorized submission views may show the value.
- `personal`: normal views receive a masked value.
- `sensitive`: normal views receive `[sensitive]`.

Raw values require `mail-submission.read-sensitive`, a Human principal, and an explicit `includeSensitive` request. Agent principals remain redacted even if a Human delegates the sensitive-read capability.

Raw IP addresses and User-Agent strings are not persisted. A salted hash is retained only as a coarse client fingerprint. Submission metadata and notification state survive payload purge.

## Notification Outbox

Submission acceptance and notification delivery are separated. The acceptance transaction creates Outbox rows; a later delivery command calls the configured MailSender.

```text
pending -> sent
pending -> pending with exponential backoff
pending -> failed after maximum attempts
```

The aggregate Submission state is recomputed from all notification rows, preventing one successful notification from hiding another permanent failure.

The production adapter targets the Cloudflare Workers Email `send_email` binding. Local development uses a Memory Mail Sender.

## Turnstile

The adapter sends the public token to Cloudflare Siteverify from the server and may bind verification to the expected hostname. A form marked `turnstileRequired` fails closed if the secret or verifier is unavailable.

The Mail Form Confirmation token is a separate baserEdge HMAC token. It does not replace Turnstile and exists to bind the validated values to a single durable submission attempt.

## D1 storage

Migration `0006_mail_form.sql` adds:

- `mail_forms`
- `mail_form_field_policies`
- `mail_confirmation_sessions`
- `mail_submissions`
- `mail_submission_payloads`
- `mail_notification_outbox`

D1 triggers validate the Mail Form/Content/Table binding, Field membership, and Confirmation consistency before Submission insertion. Confirmation consumption occurs in the same transaction as Submission creation.

## AI boundary

Public form values are untrusted user content. They are not interpreted as instructions and are not automatically placed into Agent context. Agent submission views remain redacted. A later classification or response Agent must use a separate, purpose-limited tool and explicit Human-approved data policy.

## Known incomplete areas

- automatic Queue/Cron notification consumer
- rate-limit Durable Object or platform Rate Limiting binding
- attachment quarantine and malware scanning
- automatic retention purge
- full baserCMS MailField option compatibility
- multi-step/conditional forms
- production Email Service and Turnstile deployment test
