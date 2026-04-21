-- Migration 0010: Add mcp_spec_versions column to servers table

ALTER TABLE servers ADD COLUMN IF NOT EXISTS mcp_spec_versions TEXT[] NOT NULL DEFAULT '{}';
