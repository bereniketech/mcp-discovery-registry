-- Migration 0009: Webhooks table for new server submission notifications

CREATE TABLE webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('discord', 'slack', 'generic')),
  events      TEXT[] NOT NULL DEFAULT '{server.created}',
  secret      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
