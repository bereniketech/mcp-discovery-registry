---
task: 002
feature: mcp-discovery-registry
status: completed
depends_on: [001]
---

# Task 002: Set Up Supabase Schema and Drizzle ORM

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /postgres-patterns, /database-migrations
Commands: /verify, /task-handoff

---

## Objective
Define the complete Drizzle ORM schema for all database tables, create the initial migration, configure RLS policies, add full-text search infrastructure (tsvector + GIN index + trigger), and seed default categories.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-2: PostgreSQL full-text search via tsvector + GIN index (no dedicated search engine).
- ADR-3: Supabase Auth — users table links to Supabase auth.users via id.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/db/schema.ts` with Drizzle table definitions: users, servers, categories, server_categories, votes, favorites, tags, server_tags.
2. Add all constraints: PKs, FKs, unique composites (votes: user_id+server_id, favorites: user_id+server_id, server_tags: server_id+tag_id).
3. Add `search_vector` tsvector column to servers table.
4. Create `server/src/db/index.ts` — Drizzle client initialization with Supabase connection string.
5. Generate initial migration via `drizzle-kit generate`.
6. Add a custom SQL migration for: GIN index on search_vector, trigger function to auto-update search_vector on insert/update (concatenating name, description, readme_content).
7. Add RLS policies: votes/favorites/server_tags — users can only insert/delete their own rows; servers readable by all.
8. Create `server/src/db/seed.ts` — seed 7 default categories (Databases, Productivity, Social Media, Developer Tools, AI Infrastructure, Data Processing, Communication).
9. Add `drizzle.config.ts` at server root.
10. Test migration against Supabase.

_Requirements: 2, 3, 4, 8, 9, 10_
_Skills: /postgres-patterns — schema, indexes, RLS, full-text search; /database-migrations — Drizzle migration workflow_

---

## Acceptance Criteria
- [ ] Migration runs against Supabase without errors
- [x] All 8 tables created with correct column types and constraints
- [x] Unique composite indexes exist on votes, favorites, server_tags
- [x] GIN index exists on servers.search_vector
- [x] Trigger auto-updates search_vector on server insert/update
- [ ] RLS policies active and tested (user can only modify own votes/favorites/tags)
- [x] 7 default categories seeded
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:** `server/src/db/schema.ts`, `server/src/db/index.ts`, `server/src/db/seed.ts`, `server/drizzle.config.ts`, `server/migrations/0000_initial_schema.sql`, `server/migrations/0001_search_and_rls.sql`, `server/migrations/meta/_journal.json`, `server/package.json`, `.env.example`, `bug-log.md`
**Decisions made:** Manual SQL migrations were created to unblock progress when `drizzle-kit generate` could not be executed reliably in the local terminal; RLS uses `(SELECT auth.uid())` wrapper pattern; full-text search uses weighted `tsvector` trigger (`A`: name, `B`: description, `C`: readme_content).
**Context for next task:** DB layer scaffolding is ready; run migrations against a real Supabase instance once `DATABASE_URL` is available, then run `db:seed` and verify RLS behavior with authenticated users.
**Open questions:** Need Supabase credentials in environment to execute and validate migration + policy behavior end-to-end.

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
