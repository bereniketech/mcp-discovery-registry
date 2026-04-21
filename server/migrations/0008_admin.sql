-- Migration 0008: Admin moderation panel — reports, admin flag, moderation status
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE servers
  ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'flagged', 'removed'));
