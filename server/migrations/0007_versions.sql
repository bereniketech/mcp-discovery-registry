-- Migration 0007: Add version tracking for servers
CREATE TABLE server_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  version     TEXT NOT NULL,
  release_url TEXT,
  released_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changelog   TEXT
);

CREATE INDEX ON server_versions (server_id, released_at DESC);

ALTER TABLE servers ADD COLUMN latest_version TEXT;
