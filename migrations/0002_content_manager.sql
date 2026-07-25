PRAGMA foreign_keys = ON;

CREATE TABLE content_aliases (
  alias_content_item_id TEXT PRIMARY KEY,
  target_content_item_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (alias_content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (target_content_item_id) REFERENCES content_items(id)
) STRICT;

CREATE INDEX idx_content_aliases_target ON content_aliases(target_content_item_id);

CREATE TABLE trash_entries (
  content_item_id TEXT PRIMARY KEY,
  root_content_item_id TEXT NOT NULL,
  previous_parent_id TEXT,
  previous_slug TEXT NOT NULL,
  previous_path TEXT NOT NULL,
  trashed_by TEXT NOT NULL,
  trashed_at INTEGER NOT NULL,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (root_content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (previous_parent_id) REFERENCES content_nodes(id),
  FOREIGN KEY (trashed_by) REFERENCES principals(id)
) STRICT;

CREATE INDEX idx_trash_entries_root ON trash_entries(root_content_item_id, previous_path);
