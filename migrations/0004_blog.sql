PRAGMA foreign_keys = ON;

CREATE TABLE blog_collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  content_item_id TEXT NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
  page_size INTEGER NOT NULL DEFAULT 10 CHECK(page_size BETWEEN 1 AND 100),
  feed_size INTEGER NOT NULL DEFAULT 20 CHECK(feed_size BETWEEN 1 AND 100),
  sort_direction TEXT NOT NULL DEFAULT 'desc' CHECK(sort_direction IN ('asc','desc')),
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE blog_articles (
  collection_id TEXT NOT NULL REFERENCES blog_collections(id) ON DELETE CASCADE,
  content_item_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  posted_at INTEGER NOT NULL,
  author_principal_id TEXT NOT NULL REFERENCES principals(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_blog_articles_collection_posted ON blog_articles(collection_id, posted_at DESC);

CREATE TABLE taxonomies (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES blog_collections(id) ON DELETE CASCADE,
  taxonomy_key TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('category','tag')),
  hierarchical INTEGER NOT NULL DEFAULT 0 CHECK(hierarchical IN (0,1)),
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(collection_id, taxonomy_key)
);

CREATE TABLE taxonomy_terms (
  id TEXT PRIMARY KEY,
  taxonomy_id TEXT NOT NULL REFERENCES taxonomies(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES taxonomy_terms(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(taxonomy_id, slug)
);
CREATE INDEX idx_taxonomy_terms_parent ON taxonomy_terms(taxonomy_id, parent_id);

CREATE TABLE revision_taxonomy_values (
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE CASCADE,
  taxonomy_id TEXT NOT NULL REFERENCES taxonomies(id) ON DELETE CASCADE,
  term_ids_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(term_ids_json)),
  PRIMARY KEY(revision_id, taxonomy_id)
);

CREATE TRIGGER validate_blog_collection_content
BEFORE INSERT ON blog_collections
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM content_items c
    WHERE c.id = NEW.content_item_id
      AND c.site_id = NEW.site_id
      AND c.workspace_id = NEW.workspace_id
      AND c.content_type_key = 'blog'
  ) THEN RAISE(ABORT, 'BLOG_CONTENT_MISMATCH') END;
END;

CREATE TRIGGER validate_blog_article_content
BEFORE INSERT ON blog_articles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM content_items c
    JOIN content_nodes n ON n.content_item_id = c.id
    JOIN blog_collections b ON b.id = NEW.collection_id
    JOIN content_nodes bn ON bn.content_item_id = b.content_item_id
    WHERE c.id = NEW.content_item_id
      AND c.content_type_key = 'article'
      AND c.site_id = b.site_id
      AND n.parent_id = bn.id
  ) THEN RAISE(ABORT, 'ARTICLE_COLLECTION_MISMATCH') END;
END;

CREATE TRIGGER validate_taxonomy_term_parent
BEFORE INSERT ON taxonomy_terms
WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM taxonomy_terms p
    JOIN taxonomies t ON t.id = NEW.taxonomy_id
    WHERE p.id = NEW.parent_id
      AND p.taxonomy_id = NEW.taxonomy_id
      AND t.hierarchical = 1
  ) THEN RAISE(ABORT, 'INVALID_TERM_PARENT') END;
END;
