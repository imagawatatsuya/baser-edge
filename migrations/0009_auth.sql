PRAGMA foreign_keys = ON;

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES principals(id),
  label TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  UNIQUE (principal_id, label)
);
CREATE INDEX idx_auth_identities_workspace ON auth_identities(workspace_id, state);

CREATE TABLE passkey_credentials (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES auth_identities(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(transports_json)),
  aaguid TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX idx_passkey_credentials_identity ON passkey_credentials(identity_id);

CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT REFERENCES principals(id),
  identity_id TEXT REFERENCES auth_identities(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('registration','authentication','step-up')),
  challenge TEXT NOT NULL,
  operation TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_webauthn_challenges_expiry ON webauthn_challenges(expires_at);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES principals(id),
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_hint TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  rotated_at INTEGER,
  revoked_at INTEGER,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX idx_auth_sessions_principal ON auth_sessions(principal_id, revoked_at, expires_at);

CREATE TABLE session_step_ups (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX uq_session_step_up_active ON session_step_ups(session_id, operation);
