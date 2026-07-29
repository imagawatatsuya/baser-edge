-- Small authenticated admin derivatives. Kept separate from originals so existing
-- asset_object_blobs foreign-key semantics remain compatible with older Workers.
CREATE TABLE asset_thumbnail_blobs (
  asset_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  body BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_asset_thumbnail_blobs_workspace ON asset_thumbnail_blobs(workspace_id);
