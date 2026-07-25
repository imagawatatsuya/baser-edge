PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at)
SELECT 'ctype_mailform_' || id,id,'mail-form','メールフォーム','["routable","documentEditable","submittable"]','active',CAST(strftime('%s','now') AS INTEGER)*1000 FROM workspaces;

CREATE TABLE mail_forms (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  content_item_id TEXT NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE RESTRICT,
  recipient_emails_json TEXT NOT NULL CHECK(json_valid(recipient_emails_json)),
  sender_address TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  auto_reply_enabled INTEGER NOT NULL DEFAULT 0 CHECK(auto_reply_enabled IN (0,1)),
  auto_reply_email_field_key TEXT,
  auto_reply_subject TEXT NOT NULL,
  confirmation_ttl_seconds INTEGER NOT NULL CHECK(confirmation_ttl_seconds BETWEEN 60 AND 3600),
  retention_days INTEGER NOT NULL CHECK(retention_days BETWEEN 1 AND 3650),
  turnstile_required INTEGER NOT NULL DEFAULT 1 CHECK(turnstile_required IN (0,1)),
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_mail_forms_site ON mail_forms(site_id,state);

CREATE TABLE mail_form_field_policies (
  mail_form_id TEXT NOT NULL REFERENCES mail_forms(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE RESTRICT,
  privacy_class TEXT NOT NULL CHECK(privacy_class IN ('non-personal','personal','sensitive')),
  include_owner_notification INTEGER NOT NULL DEFAULT 1 CHECK(include_owner_notification IN (0,1)),
  include_auto_reply INTEGER NOT NULL DEFAULT 1 CHECK(include_auto_reply IN (0,1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(mail_form_id,field_id)
);

CREATE TABLE mail_confirmation_sessions (
  id TEXT PRIMARY KEY,
  mail_form_id TEXT NOT NULL REFERENCES mail_forms(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  values_hash TEXT NOT NULL,
  client_fingerprint_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_mail_confirmations_expiry ON mail_confirmation_sessions(expires_at,used_at);

CREATE TABLE mail_submissions (
  id TEXT PRIMARY KEY,
  mail_form_id TEXT NOT NULL REFERENCES mail_forms(id) ON DELETE CASCADE,
  confirmation_id TEXT NOT NULL UNIQUE REFERENCES mail_confirmation_sessions(id) ON DELETE RESTRICT,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  payload_hash TEXT NOT NULL,
  payload_state TEXT NOT NULL DEFAULT 'available' CHECK(payload_state IN ('available','purged')),
  client_fingerprint_hash TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  purge_at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('accepted','notification-pending','notified','notification-failed'))
);
CREATE INDEX idx_mail_submissions_form ON mail_submissions(mail_form_id,received_at DESC);
CREATE INDEX idx_mail_submissions_purge ON mail_submissions(payload_state,purge_at);

CREATE TABLE mail_submission_payloads (
  submission_id TEXT PRIMARY KEY REFERENCES mail_submissions(id) ON DELETE CASCADE,
  values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  created_at INTEGER NOT NULL
);

CREATE TABLE mail_notification_outbox (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES mail_submissions(id) ON DELETE CASCADE,
  notification_kind TEXT NOT NULL CHECK(notification_kind IN ('owner','auto-reply')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  available_at INTEGER NOT NULL,
  sent_at INTEGER,
  last_error TEXT NOT NULL DEFAULT '',
  UNIQUE(submission_id,notification_kind,recipient)
);
CREATE INDEX idx_mail_notifications_pending ON mail_notification_outbox(state,available_at);

CREATE TRIGGER mail_forms_validate_insert
BEFORE INSERT ON mail_forms
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM content_items c JOIN custom_tables t ON t.id=NEW.table_id
    WHERE c.id=NEW.content_item_id AND c.content_type_key='mail-form'
      AND c.workspace_id=NEW.workspace_id AND c.site_id=NEW.site_id
      AND t.workspace_id=NEW.workspace_id AND t.table_kind='content' AND t.state='active'
  ) THEN RAISE(ABORT,'MAIL_FORM_INVALID_BINDING') END;
END;

CREATE TRIGGER mail_form_policy_validate_insert
BEFORE INSERT ON mail_form_field_policies
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM mail_forms m JOIN custom_table_fields tf ON tf.table_id=m.table_id
    WHERE m.id=NEW.mail_form_id AND tf.field_id=NEW.field_id
  ) THEN RAISE(ABORT,'MAIL_FORM_FIELD_NOT_IN_TABLE') END;
END;

CREATE TRIGGER mail_submission_validate_insert
BEFORE INSERT ON mail_submissions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM mail_confirmation_sessions c
    WHERE c.id=NEW.confirmation_id AND c.mail_form_id=NEW.mail_form_id
      AND c.used_at IS NULL AND c.expires_at >= NEW.received_at
      AND c.schema_version=NEW.schema_version AND c.values_hash=NEW.payload_hash
  ) THEN RAISE(ABORT,'MAIL_CONFIRMATION_INVALID_OR_USED') END;
END;

CREATE TRIGGER mail_submission_mark_confirmation_used
AFTER INSERT ON mail_submissions
BEGIN
  UPDATE mail_confirmation_sessions SET used_at=NEW.received_at WHERE id=NEW.confirmation_id;
END;
