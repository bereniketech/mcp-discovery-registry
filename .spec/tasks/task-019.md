---
task: 019
feature: mcp-discovery-registry
status: open
priority: P3
depends_on: [018]
---

# Task 019: P3 — Response Caching, Dead Column Cleanup, Orphaned Stubs, Pagination Gaps

## Skills
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/data/database-architect.md`
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/development/refactor-clean.md`
- `.kit/commands/core/task-handoff.md`
- `.kit/commands/core/wrapup.md`

---

## Objective
Production-readiness pass: four cleanup and polish items.
1. List and detail endpoints have no response caching — high-frequency reads hit DB every time.
2. `votes.value` column exists in DB but is unused dead weight (votes are boolean toggle, not scored).
3. Orphaned stub files remain from scaffolding — dead code that confuses future contributors.
4. `GET /api/v1/me/favorites` and `GET /api/v1/me/submissions` have no pagination — returns unbounded result sets.

---

## Codebase Context

### Files to Read First
- `server/src/routes/servers.ts` (or list routes) — where list/detail handlers live
- `server/src/db/schema.ts` — confirm `votes.value` column existence
- `server/src/db/migrations/` — for writing the drop-column migration
- `server/src/routes/me.ts` (or `user.ts`) — favorites and submissions endpoints
- `server/src/` — search for stub/placeholder files (empty handlers, TODO-only files)
- `client/src/` — search for stub pages or components

---

## Implementation Steps

### Fix 1 — Response caching for list and detail endpoints
**Strategy: in-memory cache with TTL** (no Redis dependency for Phase 1 — use `node-cache` or a simple Map with expiry).

1. Install `node-cache` in server package: `npm install node-cache`.
2. Create `server/src/lib/cache.ts`:
   ```ts
   import NodeCache from 'node-cache'
   export const apiCache = new NodeCache({ stdTTL: 60, checkperiod: 30 })
   ```
3. Create `server/src/middleware/cache-middleware.ts`:
   ```ts
   export function cacheResponse(ttlSeconds: number) {
     return (req, res, next) => {
       const key = req.originalUrl
       const cached = apiCache.get(key)
       if (cached) return res.json(cached)
       const originalJson = res.json.bind(res)
       res.json = (body) => {
         apiCache.set(key, body, ttlSeconds)
         return originalJson(body)
       }
       next()
     }
   }
   ```
4. Apply TTLs per design.md spec:
   - `GET /api/v1/servers` (list) → 60s TTL
   - `GET /api/v1/servers/:slug` (detail) → 300s TTL
   - `GET /api/v1/categories` → 300s TTL (rarely changes)
   - `GET /api/v1/tags` → 120s TTL
   - `GET /api/v1/trending` → 60s TTL
5. Cache invalidation: on any write to a server record (vote, tag, submit), call `apiCache.flushAll()` or invalidate specific keys.
6. Do NOT cache authenticated endpoints (`/me/*`).

### Fix 2 — Drop votes.value dead column
1. Confirm `votes` table has `value` column in `server/src/db/schema.ts`.
2. Remove `value` from Drizzle schema definition.
3. Generate migration: `npx drizzle-kit generate` — verify it produces `ALTER TABLE votes DROP COLUMN value`.
4. Apply migration.
5. Search server codebase for any code that reads or writes `votes.value` — remove references.
6. Update `VoteService` to confirm it only uses `user_id`, `server_id`, `created_at`.

### Fix 3 — Delete orphaned stub files
1. Search for files matching these patterns:
   - Files containing only `// TODO`, `// stub`, `export {}`, or fewer than 10 lines with no real logic
   - Files in `server/src/` or `client/src/` that are imported nowhere
2. Candidates to check (read each before deleting):
   - Any `*.stub.ts`, `*.placeholder.ts`, or `temp-*.ts` files
   - Empty route handlers registered but returning only `res.json({ ok: true })`
   - Client pages that render only `<div>Coming soon</div>`
3. For each candidate: confirm it is not imported anywhere (`grep -r "filename"`) before deleting.
4. Do not delete test fixtures or mock files — those are intentional stubs.

### Fix 4 — Add pagination to /me/favorites and /me/submissions
1. In `GET /api/v1/me/favorites`:
   - Accept `?page=1&per_page=20` query params (default: page=1, per_page=20, max per_page=100)
   - Add `.limit(perPage).offset((page - 1) * perPage)` to Drizzle query
   - Return `{ data: [...], meta: { page, per_page, total } }` — count total with separate query
2. In `GET /api/v1/me/submissions`:
   - Same pagination pattern
   - Sort by `created_at DESC`
3. Update shared `PaginatedResponse<T>` type in `shared/src/types/` if not already generic.
4. On the frontend: update `UserProfile` favorites and submissions tabs to use paginated fetch and render page controls.
5. Add tests: verify page=2 returns different records than page=1 when total > per_page.

---

## Acceptance Criteria
- [x] `GET /api/v1/servers` response is served from cache on second identical request (verified by response time or cache-hit header)
- [x] Cache-Control or X-Cache header added to cached responses for observability
- [x] `votes.value` column dropped from DB; migration applied cleanly
- [x] No server code references `votes.value` after cleanup
- [x] All identified stub/orphan files deleted; no broken imports
- [x] `GET /api/v1/me/favorites?page=1&per_page=20` returns paginated response with `meta.total`
- [x] `GET /api/v1/me/submissions?page=1&per_page=20` returns paginated response with `meta.total`
- [x] Frontend favorites and submissions tabs render page controls when total > 20
- [x] `npm run build` and `npm test` pass
- [x] No Lighthouse score regression (>= 90 desktop)

Status: COMPLETE

---

## Completion
This is the final task in the P0–P3 remediation series. After completing:
1. Run `/task-handoff` to record changes.
2. Run `/wrapup` to generate a summary of all work done in tasks 016–019.
3. Update `bug-log.md` with any issues encountered.
