-- Migration 0006: Add server health tracking fields
ALTER TABLE servers
  ADD COLUMN health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('healthy', 'stale', 'dead', 'unknown'));

ALTER TABLE servers
  ADD COLUMN health_checked_at TIMESTAMPTZ;

ALTER TABLE servers
  ADD COLUMN health_reason TEXT;
