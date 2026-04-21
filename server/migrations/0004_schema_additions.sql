-- Migration 0004: Schema Additions
-- Adds tool_schemas and config_template to servers,
-- display_order to categories, and email to users.

-- servers: tool_schemas (jsonb array, default empty array)
ALTER TABLE "servers"
  ADD COLUMN IF NOT EXISTS "tool_schemas" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- servers: config_template (jsonb, nullable)
ALTER TABLE "servers"
  ADD COLUMN IF NOT EXISTS "config_template" jsonb;

-- categories: display_order (integer, default 0)
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0;

-- users: email (text, nullable — not all OAuth providers expose email)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email" text;
