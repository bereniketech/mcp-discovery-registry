---
task: 018
feature: mcp-discovery-registry
status: open
priority: P2
depends_on: [017]
---

# Task 018: P2 — DB Schema Additions, GitHub Metadata Cron, Community Tagging Fix, Schema Gaps

## Skills
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/data/database-architect.md`
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/core/task-handoff.md`

---

## Objective
Close five schema and business logic gaps identified in the P2 audit:
1. `tool_schemas` and `config_template` columns are in the design.md ER diagram but may be absent from the actual Drizzle schema — add with migration.
2. GitHub metadata refresh runs on submit only — no cron to keep stars/forks/last_commit fresh.
3. Community tagging currently checks `server.submitted_by === user.id` — should allow any authenticated user.
4. `categories` table missing `display_order` column — needed for ordered category nav.
5. `users` table missing `email` column — required for future notifications.

---

## Codebase Context

### Files to Read First
- `server/src/db/schema.ts` — current Drizzle schema definitions
- `server/src/db/migrations/` — existing migration files (check highest number)
- `server/src/routes/` or `server/src/services/tag-service.ts` — find ownership check for tagging
- `server/src/services/github-fetcher.ts` (or equivalent) — GitHub metadata fetch logic
- `server/src/` — look for any existing cron/scheduler setup

---

## Implementation Steps

### Fix 1 — Add tool_schemas + config_template to servers schema
1. In `server/src/db/schema.ts`, add to `servers` table:
   ```ts
   tool_schemas: jsonb('tool_schemas').$type<ToolSchema[]>().default([]),
   config_template: jsonb('config_template').$type<ConfigTemplate | null>(),
   ```
2. Define `ToolSchema` and `ConfigTemplate` types in `shared/src/types/`.
3. Generate migration: `npx drizzle-kit generate` — review the generated SQL before applying.
4. Update `ServerService.create()` and `GitHubFetcherService.fetch()` to populate `tool_schemas` when available from GitHub repo topics or README parsing.
5. Update `GET /api/v1/servers/:slug` response to include `tool_schemas` and `config_template`.
6. Update `ConfigGenerator` on the frontend to use `config_template` when present.

### Fix 2 — GitHub metadata refresh cron
1. Install `node-cron` (or use `setInterval` for simplicity) in the server package.
2. Create `server/src/jobs/refresh-github-metadata.ts`:
   - Query all servers with `updated_at < now() - interval '6 hours'`
   - Batch in groups of 10 (respect GitHub rate limits)
   - For each: call `GitHubFetcherService.refresh(server.github_url)`
   - Update `github_stars`, `github_forks`, `open_issues`, `last_commit_at`, `updated_at`
   - Use conditional requests with `ETag` header to avoid rate limit burn
3. Register cron in `server/src/index.ts`: schedule every 6 hours (`0 */6 * * *`).
4. Add `GITHUB_TOKEN` env var guard — log warning and skip cron if not set.
5. Add manual trigger endpoint: `POST /api/v1/admin/refresh-metadata` (admin-only, protected by service token).

### Fix 3 — Community tagging: allow any authenticated user
1. Find the ownership check in tag route handler or `TagService`.
2. Current (incorrect): `if (server.submitted_by !== req.user.id) return 403`
3. Fix: remove the ownership check entirely. Any authenticated user may tag.
4. Keep the constraint: user cannot add duplicate tag to same server (DB unique constraint on `server_tags(server_id, tag_id)` handles this).
5. Keep rate limiting: `writeLimiter` applied in task-017 covers this.
6. Add test: user B (not submitter) can tag a server submitted by user A.

### Fix 4 — Add display_order to categories
1. Add `display_order: integer('display_order').default(0)` to `categories` table in Drizzle schema.
2. Generate and apply migration.
3. Update seed data / admin tooling to set `display_order` for each category.
4. Update `GET /api/v1/categories` (task-016) to order by `display_order ASC, name ASC` — should already do this; confirm.
5. Update CategorySidebar on frontend to render categories in returned order (do not sort client-side).

### Fix 5 — Add email to users schema
1. Add `email: text('email')` to `users` table in Drizzle schema (nullable — not all OAuth users expose email).
2. Generate and apply migration.
3. Update the Supabase Auth callback handler to populate `email` from OAuth user metadata if present.
4. Do not expose `email` in public API responses — internal field only.

---

## Acceptance Criteria
- [ ] `servers` table has `tool_schemas` (jsonb) and `config_template` (jsonb) columns in DB
- [ ] Migration file exists and applies cleanly on fresh DB
- [ ] GitHub metadata cron runs every 6 hours and updates stale records
- [ ] Any authenticated user can tag any server (not just the submitter)
- [ ] `categories` table has `display_order` integer column
- [ ] `GET /api/v1/categories` returns categories in `display_order` order
- [ ] `users` table has `email` column (nullable)
- [ ] No existing tests broken; add tests for tagging permission fix and cron job logic
- [ ] `npm run build` and `npm test` pass

---

## Handoff to Next Task
After completing, run `/task-handoff`. Record:
- Migration file names created
- Cron schedule chosen and library used
- Whether `tool_schemas` is populated from GitHub data or left for future work
