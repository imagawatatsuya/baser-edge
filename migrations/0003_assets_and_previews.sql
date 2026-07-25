PRAGMA foreign_keys = ON;

CREATE TABLE upload_sessions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  media_type TEXT NOT NULL,
  maximum_bytes INTEGER NOT NULL CHECK (maximum_bytes > 0),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','expired','failed')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  failure_reason TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE INDEX idx_upload_sessions_pending ON upload_sessions(state, expires_at);
CREATE UNIQUE INDEX uq_upload_session_asset_pending ON upload_sessions(asset_id) WHERE state='pending';

CREATE TABLE preview_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  revision_hash TEXT NOT NULL,
  theme_release TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_accessed_at INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE INDEX idx_preview_active ON preview_sessions(site_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_preview_revision ON preview_sessions(revision_id);

CREATE TRIGGER trg_preview_revision_integrity_insert
BEFORE INSERT ON preview_sessions
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM content_revisions r
    JOIN content_items c ON c.id = r.content_item_id
    WHERE r.id = NEW.revision_id
      AND r.content_item_id = NEW.content_item_id
      AND r.content_hash = NEW.revision_hash
      AND c.site_id = NEW.site_id
      AND c.workspace_id = NEW.workspace_id
  ) THEN RAISE(ABORT, 'PREVIEW_REVISION_MISMATCH') END;
END;
