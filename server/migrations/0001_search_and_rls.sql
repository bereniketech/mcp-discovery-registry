-- GIN index on servers.search_vector for full-text search (non-blocking)
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- Run this file outside a transaction block (e.g. via psql with AUTOCOMMIT=on).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_servers_search_vector
  ON servers USING gin (search_vector);

-- ─── Trigger function: auto-update search_vector ─────────────────────────────
CREATE OR REPLACE FUNCTION servers_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.readme_content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_servers_search_vector_update
  BEFORE INSERT OR UPDATE ON servers
  FOR EACH ROW EXECUTE FUNCTION servers_search_vector_update();

-- ─── Row Level Security ───────────────────────────────────────────────────────

-- servers: readable by everyone, writable only by owner
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers FORCE ROW LEVEL SECURITY;

CREATE POLICY servers_select ON servers
  FOR SELECT USING (true);

CREATE POLICY servers_insert ON servers
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY servers_update ON servers
  FOR UPDATE USING ((SELECT auth.uid()) = author_id);

CREATE POLICY servers_delete ON servers
  FOR DELETE USING ((SELECT auth.uid()) = author_id);

-- votes: users can only insert/delete their own rows
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes FORCE ROW LEVEL SECURITY;

CREATE POLICY votes_select ON votes
  FOR SELECT USING (true);

CREATE POLICY votes_insert ON votes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY votes_delete ON votes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- favorites: users can only insert/delete their own rows
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites FORCE ROW LEVEL SECURITY;

CREATE POLICY favorites_select ON favorites
  FOR SELECT USING (true);

CREATE POLICY favorites_insert ON favorites
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY favorites_delete ON favorites
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- server_tags: users can only insert/delete tags on their own servers
ALTER TABLE server_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_tags FORCE ROW LEVEL SECURITY;

CREATE POLICY server_tags_select ON server_tags
  FOR SELECT USING (true);

CREATE POLICY server_tags_insert ON server_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_id
        AND servers.author_id = (SELECT auth.uid())
    )
  );

CREATE POLICY server_tags_delete ON server_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_id
        AND servers.author_id = (SELECT auth.uid())
    )
  );

-- server_categories: same pattern as server_tags
ALTER TABLE server_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY server_categories_select ON server_categories
  FOR SELECT USING (true);

CREATE POLICY server_categories_insert ON server_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_id
        AND servers.author_id = (SELECT auth.uid())
    )
  );

CREATE POLICY server_categories_delete ON server_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_id
        AND servers.author_id = (SELECT auth.uid())
    )
  );

-- users: readable by everyone, writable only by the owner
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users
  FOR SELECT USING (true);

CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY users_update ON users
  FOR UPDATE USING ((SELECT auth.uid()) = id);
