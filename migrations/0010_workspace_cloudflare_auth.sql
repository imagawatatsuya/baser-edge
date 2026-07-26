PRAGMA foreign_keys = ON;

ALTER TABLE workspaces ADD COLUMN cloudflare_account_id TEXT;
ALTER TABLE workspaces ADD COLUMN cloudflare_owner_email TEXT;

CREATE UNIQUE INDEX idx_workspaces_cf_account ON workspaces(cloudflare_account_id)
  WHERE cloudflare_account_id IS NOT NULL;

CREATE TABLE cf_oauth_login_challenges (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
