PRAGMA foreign_keys = ON;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ja-JP',
  state TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (workspace_id, hostname),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
) STRICT;

CREATE TABLE principals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
) STRICT;

CREATE TABLE capability_grants (
  id TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  valid_from INTEGER,
  valid_until INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (principal_id) REFERENCES principals(id)
) STRICT;

CREATE INDEX idx_capability_grants_principal ON capability_grants(principal_id, capability);

CREATE TABLE delegation_grants (
  id TEXT PRIMARY KEY,
  human_principal_id TEXT NOT NULL,
  agent_principal_id TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  maximum_risk TEXT NOT NULL DEFAULT 'medium',
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (human_principal_id) REFERENCES principals(id),
  FOREIGN KEY (agent_principal_id) REFERENCES principals(id)
) STRICT;

CREATE TABLE content_types (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type_key TEXT NOT NULL,
  title TEXT NOT NULL,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  UNIQUE (workspace_id, type_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
) STRICT;

CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  content_type_key TEXT NOT NULL,
  working_revision_id TEXT,
  published_revision_id TEXT,
  lock_version INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE INDEX idx_content_items_site_type ON content_items(site_id, content_type_key, state);

CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  based_on_revision_id TEXT,
  expected_lock_version INTEGER NOT NULL,
  fields_json TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  agent_run_id TEXT,
  change_summary TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE (content_item_id, revision_number),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (based_on_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE TRIGGER validate_revision_commit
BEFORE INSERT ON content_revisions
BEGIN
  SELECT CASE
    WHEN (SELECT lock_version FROM content_items WHERE id = NEW.content_item_id) != NEW.expected_lock_version
      THEN RAISE(ABORT, 'REVISION_CONFLICT')
    WHEN COALESCE((SELECT working_revision_id FROM content_items WHERE id = NEW.content_item_id), '') != COALESCE(NEW.based_on_revision_id, '')
      THEN RAISE(ABORT, 'REVISION_CONFLICT')
  END;
END;

CREATE TRIGGER advance_working_revision
AFTER INSERT ON content_revisions
BEGIN
  UPDATE content_items
  SET working_revision_id = NEW.id,
      lock_version = lock_version + 1,
      updated_at = NEW.created_at
  WHERE id = NEW.content_item_id;
END;

CREATE TABLE revision_documents (
  revision_id TEXT PRIMARY KEY,
  format_version INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  document_hash TEXT NOT NULL,
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE editing_drafts (
  content_item_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  based_on_revision_id TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (content_item_id, principal_id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (principal_id) REFERENCES principals(id),
  FOREIGN KEY (based_on_revision_id) REFERENCES content_revisions(id)
) STRICT;

CREATE TABLE content_nodes (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL UNIQUE,
  parent_id TEXT,
  slug TEXT NOT NULL,
  sort_key TEXT NOT NULL,
  cached_path TEXT NOT NULL,
  tree_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (parent_id) REFERENCES content_nodes(id)
) STRICT;

CREATE UNIQUE INDEX uq_content_node_child_slug ON content_nodes(site_id, parent_id, slug) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX uq_content_node_root_slug ON content_nodes(site_id, slug) WHERE parent_id IS NULL;
CREATE INDEX idx_content_nodes_path ON content_nodes(site_id, cached_path);

CREATE TABLE tree_move_guards (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  expected_tree_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TRIGGER validate_tree_move_guard
BEFORE INSERT ON tree_move_guards
BEGIN
  SELECT CASE
    WHEN (SELECT tree_version FROM content_nodes WHERE id = NEW.node_id) != NEW.expected_tree_version
      THEN RAISE(ABORT, 'TREE_CONFLICT')
  END;
END;

CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL,
  hostname TEXT NOT NULL,
  path TEXT NOT NULL,
  route_type TEXT NOT NULL,
  is_canonical INTEGER NOT NULL CHECK (is_canonical IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  activated_at INTEGER NOT NULL,
  deactivated_at INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id)
) STRICT;

CREATE UNIQUE INDEX uq_active_route ON routes(site_id, hostname, path) WHERE active = 1;
CREATE INDEX idx_routes_content ON routes(content_item_id, active, is_canonical);

CREATE TABLE redirects (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  source_hostname TEXT NOT NULL,
  source_path TEXT NOT NULL,
  target_route_id TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (target_route_id) REFERENCES routes(id)
) STRICT;

CREATE UNIQUE INDEX uq_active_redirect ON redirects(site_id, source_hostname, source_path) WHERE active = 1;

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_principal_id TEXT NOT NULL,
  instructed_by TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  base_revision_id TEXT NOT NULL,
  produced_revision_id TEXT,
  state TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (agent_principal_id) REFERENCES principals(id),
  FOREIGN KEY (instructed_by) REFERENCES principals(id),
  FOREIGN KEY (base_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (produced_revision_id) REFERENCES content_revisions(id)
) STRICT;

CREATE TABLE change_sets (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  base_revision_id TEXT NOT NULL,
  result_revision_id TEXT,
  operations_json TEXT NOT NULL,
  diff_json TEXT,
  risk_level TEXT NOT NULL,
  state TEXT NOT NULL,
  created_by TEXT NOT NULL,
  agent_run_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (base_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (result_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (created_by) REFERENCES principals(id),
  FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id)
) STRICT;

CREATE TABLE approval_requests (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  revision_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER,
  decision_comment TEXT,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (requested_by) REFERENCES principals(id),
  FOREIGN KEY (decided_by) REFERENCES principals(id)
) STRICT;

CREATE TABLE publication_events (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  previous_revision_id TEXT,
  published_revision_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  actor_principal_id TEXT NOT NULL,
  committed_at INTEGER NOT NULL,
  verification_state TEXT NOT NULL DEFAULT 'pending',
  verified_at INTEGER,
  verification_error TEXT,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (previous_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (published_revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (approval_id) REFERENCES approval_requests(id),
  FOREIGN KEY (actor_principal_id) REFERENCES principals(id)
) STRICT;

CREATE TRIGGER validate_publication
BEFORE INSERT ON publication_events
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM approval_requests a
      JOIN content_revisions r ON r.id = a.revision_id
      WHERE a.id = NEW.approval_id
        AND a.content_item_id = NEW.content_item_id
        AND a.revision_id = NEW.published_revision_id
        AND a.state = 'approved'
        AND a.revision_hash = r.content_hash
    ) THEN RAISE(ABORT, 'REVISION_NOT_APPROVED')
  END;
END;

CREATE TRIGGER advance_published_revision
AFTER INSERT ON publication_events
BEGIN
  UPDATE content_items
  SET published_revision_id = NEW.published_revision_id,
      updated_at = NEW.committed_at
  WHERE id = NEW.content_item_id;
END;

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  site_id TEXT,
  occurred_at INTEGER NOT NULL,
  actor_principal_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  on_behalf_of_principal_id TEXT,
  delegation_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  revision_id TEXT,
  capability TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  request_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (actor_principal_id) REFERENCES principals(id),
  FOREIGN KEY (on_behalf_of_principal_id) REFERENCES principals(id),
  FOREIGN KEY (delegation_id) REFERENCES delegation_grants(id),
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id)
) STRICT;

CREATE INDEX idx_audit_resource_time ON audit_events(resource_type, resource_id, occurred_at DESC);

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
) STRICT;

CREATE INDEX idx_outbox_pending ON outbox_events(state, available_at);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER,
  checksum TEXT,
  width INTEGER,
  height INTEGER,
  state TEXT NOT NULL DEFAULT 'pending',
  owner_principal_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (owner_principal_id) REFERENCES principals(id)
) STRICT;

CREATE TABLE asset_variants (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  state TEXT NOT NULL DEFAULT 'processing',
  created_at INTEGER NOT NULL,
  UNIQUE (asset_id, variant_name),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE revision_asset_references (
  revision_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  block_id TEXT,
  field_path TEXT NOT NULL,
  usage TEXT NOT NULL,
  PRIMARY KEY (revision_id, asset_id, field_path),
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
) STRICT;

CREATE TABLE search_documents (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  content_item_id TEXT NOT NULL UNIQUE,
  revision_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  content_type_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_text TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  projection_version INTEGER NOT NULL,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (revision_id) REFERENCES content_revisions(id),
  FOREIGN KEY (site_id) REFERENCES sites(id)
) STRICT;

CREATE VIRTUAL TABLE search_documents_fts USING fts5(
  title,
  summary,
  body_text,
  content='search_documents',
  content_rowid='rowid'
);

CREATE TABLE projection_status (
  publication_event_id TEXT NOT NULL,
  projection_type TEXT NOT NULL,
  desired_version TEXT NOT NULL,
  actual_version TEXT,
  state TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (publication_event_id, projection_type),
  FOREIGN KEY (publication_event_id) REFERENCES publication_events(id)
) STRICT;
