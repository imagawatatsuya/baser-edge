PRAGMA foreign_keys = ON;

CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  theme_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','disabled')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (workspace_id, theme_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE TABLE design_token_revisions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  tokens_json TEXT NOT NULL CHECK (json_valid(tokens_json)),
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (theme_id, revision_number),
  FOREIGN KEY (theme_id) REFERENCES themes(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE TABLE layout_revisions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  layout_json TEXT NOT NULL CHECK (json_valid(layout_json)),
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (theme_id, revision_number),
  FOREIGN KEY (theme_id) REFERENCES themes(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE TABLE theme_releases (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  version TEXT NOT NULL,
  design_token_revision_id TEXT NOT NULL,
  layout_revision_id TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  release_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready' CHECK (state IN ('ready','retired')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (theme_id, version),
  UNIQUE (release_hash),
  FOREIGN KEY (theme_id) REFERENCES themes(id),
  FOREIGN KEY (design_token_revision_id) REFERENCES design_token_revisions(id),
  FOREIGN KEY (layout_revision_id) REFERENCES layout_revisions(id),
  FOREIGN KEY (created_by) REFERENCES principals(id)
) STRICT;

CREATE TRIGGER validate_theme_release_artifacts
BEFORE INSERT ON theme_releases
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM design_token_revisions d
    WHERE d.id=NEW.design_token_revision_id AND d.theme_id=NEW.theme_id
  ) THEN RAISE(ABORT,'THEME_TOKEN_MISMATCH') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM layout_revisions l
    WHERE l.id=NEW.layout_revision_id AND l.theme_id=NEW.theme_id
  ) THEN RAISE(ABORT,'THEME_LAYOUT_MISMATCH') END;
END;

CREATE TABLE site_theme_activations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  theme_release_id TEXT NOT NULL,
  activated_by TEXT NOT NULL,
  activated_at INTEGER NOT NULL,
  deactivated_at INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (theme_release_id) REFERENCES theme_releases(id),
  FOREIGN KEY (activated_by) REFERENCES principals(id)
) STRICT;

CREATE UNIQUE INDEX uq_site_active_theme ON site_theme_activations(site_id) WHERE deactivated_at IS NULL;
CREATE INDEX idx_theme_release_history ON site_theme_activations(site_id, activated_at DESC);

CREATE TRIGGER prevent_theme_release_mutation
BEFORE UPDATE ON theme_releases
BEGIN
  SELECT RAISE(ABORT,'THEME_RELEASE_IMMUTABLE');
END;

CREATE TRIGGER prevent_design_token_revision_mutation
BEFORE UPDATE ON design_token_revisions
BEGIN
  SELECT RAISE(ABORT,'DESIGN_TOKEN_REVISION_IMMUTABLE');
END;

CREATE TRIGGER prevent_layout_revision_mutation
BEFORE UPDATE ON layout_revisions
BEGIN
  SELECT RAISE(ABORT,'LAYOUT_REVISION_IMMUTABLE');
END;
