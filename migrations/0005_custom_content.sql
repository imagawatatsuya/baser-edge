PRAGMA foreign_keys = ON;

CREATE TABLE custom_fields (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('text','textarea','integer','decimal','boolean','date','datetime','email','tel','select','multiselect','asset','richtext')),
  description TEXT NOT NULL DEFAULT '',
  options_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(options_json)),
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id, field_key)
);

CREATE TABLE custom_tables (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  table_key TEXT NOT NULL,
  name TEXT NOT NULL,
  table_kind TEXT NOT NULL CHECK(table_kind IN ('content','master')),
  hierarchical INTEGER NOT NULL DEFAULT 0 CHECK(hierarchical IN (0,1)),
  display_field_key TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK(schema_version >= 1),
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id, table_key),
  CHECK(table_kind = 'master' OR hierarchical = 0)
);

CREATE TABLE custom_table_fields (
  table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE RESTRICT,
  required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)),
  searchable INTEGER NOT NULL DEFAULT 0 CHECK(searchable IN (0,1)),
  is_unique INTEGER NOT NULL DEFAULT 0 CHECK(is_unique IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  label_override TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(table_id, field_id)
);
CREATE INDEX idx_custom_table_fields_order ON custom_table_fields(table_id, sort_order, field_id);

CREATE TABLE custom_contents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  content_item_id TEXT NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE RESTRICT,
  list_count INTEGER NOT NULL DEFAULT 10 CHECK(list_count BETWEEN 1 AND 100),
  list_order_field_key TEXT NOT NULL,
  list_direction TEXT NOT NULL DEFAULT 'asc' CHECK(list_direction IN ('asc','desc')),
  template_key TEXT NOT NULL DEFAULT 'default',
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_custom_contents_site ON custom_contents(site_id, state);

CREATE TABLE custom_entries (
  id TEXT PRIMARY KEY,
  custom_content_id TEXT NOT NULL REFERENCES custom_contents(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES custom_tables(id) ON DELETE RESTRICT,
  slug TEXT,
  parent_entry_id TEXT REFERENCES custom_entries(id) ON DELETE RESTRICT,
  working_revision_id TEXT NOT NULL,
  published_revision_id TEXT,
  lock_version INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','trashed')),
  created_by TEXT NOT NULL REFERENCES principals(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(custom_content_id, slug),
  CHECK(slug IS NULL OR slug NOT GLOB '[0-9]*' OR slug GLOB '*[^0-9]*'),
  FOREIGN KEY(working_revision_id) REFERENCES custom_entry_revisions(id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(published_revision_id) REFERENCES custom_entry_revisions(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE custom_entry_revisions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES custom_entries(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  revision_number INTEGER NOT NULL CHECK(revision_number >= 1),
  based_on_revision_id TEXT REFERENCES custom_entry_revisions(id) ON DELETE RESTRICT,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  expected_lock_version INTEGER NOT NULL DEFAULT 0,
  values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES principals(id) ON DELETE RESTRICT,
  change_summary TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(entry_id, revision_number)
);
CREATE INDEX idx_custom_entry_revisions_entry ON custom_entry_revisions(entry_id, revision_number DESC);

CREATE TABLE custom_entry_values (
  revision_id TEXT NOT NULL REFERENCES custom_entry_revisions(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE RESTRICT,
  value_text TEXT,
  value_number REAL,
  value_integer INTEGER,
  value_boolean INTEGER CHECK(value_boolean IN (0,1) OR value_boolean IS NULL),
  value_timestamp INTEGER,
  value_json TEXT CHECK(value_json IS NULL OR json_valid(value_json)),
  PRIMARY KEY(revision_id, field_id)
);
CREATE INDEX idx_custom_entry_values_text ON custom_entry_values(field_id, value_text);
CREATE INDEX idx_custom_entry_values_number ON custom_entry_values(field_id, value_number);
CREATE INDEX idx_custom_entry_values_integer ON custom_entry_values(field_id, value_integer);
CREATE INDEX idx_custom_entry_values_timestamp ON custom_entry_values(field_id, value_timestamp);

CREATE TABLE custom_entry_approvals (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES custom_entries(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES custom_entry_revisions(id) ON DELETE CASCADE,
  revision_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','approved','rejected')),
  requested_by TEXT NOT NULL REFERENCES principals(id) ON DELETE RESTRICT,
  requested_at INTEGER NOT NULL,
  decided_by TEXT REFERENCES principals(id) ON DELETE RESTRICT,
  decided_at INTEGER,
  decision_comment TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_custom_entry_approvals_entry ON custom_entry_approvals(entry_id, requested_at DESC);

CREATE TRIGGER custom_contents_validate_insert
BEFORE INSERT ON custom_contents
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM content_items c JOIN custom_tables t ON t.id = NEW.table_id
    WHERE c.id = NEW.content_item_id AND c.content_type_key = 'custom-content'
      AND c.workspace_id = NEW.workspace_id AND c.site_id = NEW.site_id
      AND t.workspace_id = NEW.workspace_id AND t.table_kind = 'content' AND t.state = 'active'
  ) THEN RAISE(ABORT, 'CUSTOM_CONTENT_INVALID_BINDING') END;
END;

CREATE TRIGGER custom_table_fields_validate_insert
BEFORE INSERT ON custom_table_fields
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM custom_tables t JOIN custom_fields f ON f.id = NEW.field_id
    WHERE t.id = NEW.table_id AND t.workspace_id = f.workspace_id
  ) THEN RAISE(ABORT, 'CUSTOM_FIELD_WORKSPACE_MISMATCH') END;
END;

CREATE TRIGGER custom_entries_validate_insert
BEFORE INSERT ON custom_entries
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM custom_contents c WHERE c.id = NEW.custom_content_id AND c.table_id = NEW.table_id AND c.state = 'active'
  ) THEN RAISE(ABORT, 'CUSTOM_ENTRY_TABLE_MISMATCH') END;
  SELECT CASE WHEN NEW.parent_entry_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM custom_entries p JOIN custom_tables t ON t.id = NEW.table_id
    WHERE p.id = NEW.parent_entry_id AND p.table_id = NEW.table_id AND t.table_kind = 'master' AND t.hierarchical = 1
  ) THEN RAISE(ABORT, 'CUSTOM_ENTRY_PARENT_INVALID') END;
END;

CREATE TRIGGER custom_entry_revision_validate_insert
BEFORE INSERT ON custom_entry_revisions
WHEN EXISTS (SELECT 1 FROM custom_entries WHERE id = NEW.entry_id)
BEGIN
  SELECT CASE WHEN NEW.based_on_revision_id != (SELECT working_revision_id FROM custom_entries WHERE id = NEW.entry_id)
    THEN RAISE(ABORT, 'CUSTOM_ENTRY_REVISION_CONFLICT') END;
  SELECT CASE WHEN NEW.expected_lock_version != (SELECT lock_version FROM custom_entries WHERE id = NEW.entry_id)
    THEN RAISE(ABORT, 'CUSTOM_ENTRY_REVISION_CONFLICT') END;
  SELECT CASE WHEN NEW.revision_number != COALESCE((SELECT MAX(revision_number)+1 FROM custom_entry_revisions WHERE entry_id = NEW.entry_id),1)
    THEN RAISE(ABORT, 'CUSTOM_ENTRY_REVISION_NUMBER_INVALID') END;
END;

CREATE TRIGGER custom_entry_publish_validate
BEFORE UPDATE OF published_revision_id ON custom_entries
WHEN NEW.published_revision_id IS NOT NULL AND NEW.published_revision_id IS NOT OLD.published_revision_id
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM custom_entry_revisions r JOIN custom_entry_approvals a ON a.revision_id = r.id
    WHERE r.id = NEW.published_revision_id AND r.entry_id = NEW.id
      AND a.entry_id = NEW.id AND a.state = 'approved' AND a.revision_hash = r.content_hash
  ) THEN RAISE(ABORT, 'CUSTOM_ENTRY_APPROVAL_REQUIRED') END;
END;
