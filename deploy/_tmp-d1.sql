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
) STRICT