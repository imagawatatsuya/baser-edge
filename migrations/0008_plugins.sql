PRAGMA foreign_keys = ON;

CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  plugin_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trust TEXT NOT NULL CHECK (trust IN ('trusted','sandboxed')),
  state TEXT NOT NULL CHECK (state IN ('active','disabled')),
  created_by TEXT NOT NULL REFERENCES principals(id),
  created_at INTEGER NOT NULL,
  UNIQUE(workspace_id, plugin_key)
);
CREATE INDEX idx_plugins_workspace ON plugins(workspace_id, state, plugin_key);

CREATE TABLE plugin_releases (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins(id),
  version TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  bundle_json TEXT NOT NULL CHECK (json_valid(bundle_json)),
  release_hash TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('ready','retired')),
  created_by TEXT NOT NULL REFERENCES principals(id),
  created_at INTEGER NOT NULL,
  UNIQUE(plugin_id, version)
);
CREATE INDEX idx_plugin_releases_plugin ON plugin_releases(plugin_id, created_at DESC);

CREATE TABLE plugin_activations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  site_id TEXT REFERENCES sites(id),
  plugin_id TEXT NOT NULL REFERENCES plugins(id),
  plugin_release_id TEXT NOT NULL REFERENCES plugin_releases(id),
  granted_capabilities_json TEXT NOT NULL CHECK (json_valid(granted_capabilities_json)),
  allowed_hosts_json TEXT NOT NULL CHECK (json_valid(allowed_hosts_json)),
  state TEXT NOT NULL CHECK (state IN ('active','disabled')),
  activated_by TEXT NOT NULL REFERENCES principals(id),
  activated_at INTEGER NOT NULL,
  deactivated_at INTEGER
);
CREATE UNIQUE INDEX uq_plugin_activation_scope
  ON plugin_activations(workspace_id, COALESCE(site_id, ''), plugin_id)
  WHERE state = 'active';
CREATE INDEX idx_plugin_activations_workspace ON plugin_activations(workspace_id, state, site_id);

CREATE TABLE plugin_invocations (
  id TEXT PRIMARY KEY,
  plugin_release_id TEXT NOT NULL REFERENCES plugin_releases(id),
  activation_id TEXT NOT NULL REFERENCES plugin_activations(id),
  hook_name TEXT,
  route_id TEXT,
  request_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('succeeded','failed','blocked')),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  error_code TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_plugin_invocations_release ON plugin_invocations(plugin_release_id, created_at DESC);
CREATE INDEX idx_plugin_invocations_request ON plugin_invocations(request_id);

CREATE TRIGGER trg_plugin_release_immutable_update
BEFORE UPDATE ON plugin_releases
BEGIN
  SELECT RAISE(ABORT, 'PLUGIN_RELEASE_IMMUTABLE');
END;

CREATE TRIGGER trg_plugin_release_immutable_delete
BEFORE DELETE ON plugin_releases
BEGIN
  SELECT RAISE(ABORT, 'PLUGIN_RELEASE_IMMUTABLE');
END;

CREATE TRIGGER trg_plugin_activation_validate_insert
BEFORE INSERT ON plugin_activations
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM plugin_releases pr
    JOIN plugins p ON p.id = pr.plugin_id
    WHERE pr.id = NEW.plugin_release_id
      AND p.id = NEW.plugin_id
      AND p.workspace_id = NEW.workspace_id
      AND pr.state = 'ready'
      AND p.state = 'active'
  ) THEN RAISE(ABORT, 'PLUGIN_ACTIVATION_RELEASE_MISMATCH') END;
  SELECT CASE WHEN NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sites s WHERE s.id = NEW.site_id AND s.workspace_id = NEW.workspace_id
  ) THEN RAISE(ABORT, 'PLUGIN_ACTIVATION_SITE_MISMATCH') END;
END;

CREATE TRIGGER trg_plugin_activation_no_reactivate
BEFORE UPDATE OF state ON plugin_activations
WHEN OLD.state = 'disabled' AND NEW.state = 'active'
BEGIN
  SELECT RAISE(ABORT, 'PLUGIN_ACTIVATION_REACTIVATION_FORBIDDEN');
END;
