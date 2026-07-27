-- Trial inline asset bytes (R2-less deploys). Production uses R2; do not enable BASER_ASSET_STORAGE=d1-inline with R2.
CREATE TABLE asset_object_blobs (
  object_key TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  body BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (object_key) REFERENCES assets(object_key) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_asset_object_blobs_workspace ON asset_object_blobs(workspace_id);
