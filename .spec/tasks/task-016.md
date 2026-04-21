---
task: 016
feature: mcp-discovery-registry
status: open
priority: P0
depends_on: [015]
---

# Task 016: P0 — Missing Endpoints, Tag Param Mismatch, Env Var Fix

## Skills
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/build-fix.md`
- `.kit/commands/core/task-handoff.md`

---

## Objective
Fix three blocking bugs preventing the client from correctly consuming the API:
1. Server returns 404 for `GET /api/v1/categories` and `GET /api/v1/tags` — routes exist in the spec but are not implemented.
2. Client sends tags as comma-joined string (e.g. `tags=foo,bar`) but server expects array params (`tags[]=foo&tags[]=bar`).
3. Client uses `VITE_API_URL` but all client code references `VITE_API_BASE_URL` (or vice versa) — one must be canonical.

---

## Codebase Context

### Files to Read First
- `server/src/routes/` — identify which route files exist
- `server/src/routes/index.ts` (or equivalent router) — confirm categories/tags routes are missing
- `client/src/api/` or `client/src/lib/api.ts` — locate where `VITE_API_URL` / `VITE_API_BASE_URL` is referenced
- `client/src/` — search for tags param construction (look for `.join(',')`)
- `.env.example` — current env var names

### Architecture Decisions Affecting This Task
- API routes live under `/api/v1/` prefix (Express Router)
- Drizzle ORM used for all DB queries (see `server/src/db/schema.ts`)
- Tags filter: server must accept `?tags=foo&tags=bar` (repeated param) — Express parses this as `req.query.tags` array automatically when sent as repeated params; client must NOT join with commas

---

## Implementation Steps

### Fix 1 — Add GET /api/v1/categories
1. Read `server/src/db/schema.ts` to confirm `categories` table structure.
2. Create (or add to existing) `server/src/routes/categories.ts`:
   - `GET /` — select all categories, order by `display_order ASC, name ASC`
   - Response shape: `{ data: Category[] }`
3. Register the router in the main Express app under `/api/v1/categories`.
4. Add Zod response validation or at minimum a type-safe Drizzle query.

### Fix 2 — Add GET /api/v1/tags
1. Create (or add to existing) `server/src/routes/tags.ts`:
   - `GET /` — select tags ordered by `usage_count DESC`, limit 50
   - Accept optional `?q=<prefix>` for autocomplete
   - Response shape: `{ data: Tag[] }`
2. Register under `/api/v1/tags`.

### Fix 3 — Fix tag query param mismatch
1. In client code, find where tags filter is serialized to query string.
2. Change from: `params.append('tags', selectedTags.join(','))`
   To: `selectedTags.forEach(t => params.append('tags', t))`
3. In server list handler (`GET /api/v1/servers`), ensure `req.query.tags` is coerced to array:
   ```ts
   const tags = req.query.tags
     ? Array.isArray(req.query.tags)
       ? req.query.tags
       : [req.query.tags]
     : []
   ```
4. Drizzle query: use `inArray(serverTags.tagId, resolvedTagIds)`.

### Fix 4 — Canonicalize env var name
1. Decide canonical name: `VITE_API_BASE_URL` (matches design.md spec).
2. Search client source for all references to `VITE_API_URL` and `VITE_API_BASE_URL`.
3. Standardize to `VITE_API_BASE_URL` everywhere in client.
4. Update `.env.example` to use `VITE_API_BASE_URL=`.
5. Update any Vite config or deployment docs that reference the old name.

---

## Acceptance Criteria
- [x] `GET /api/v1/categories` returns 200 with `{ data: [...] }` — verified with curl or test
- [x] `GET /api/v1/tags` returns 200 with `{ data: [...] }` — verified with curl or test
- [x] Client tags filter sends repeated params: `?tags=foo&tags=bar` not `?tags=foo%2Cbar`
- [x] Server correctly filters by multiple tags when passed as repeated params
- [x] Only `VITE_API_BASE_URL` used across all client source files (zero occurrences of `VITE_API_URL`)
- [x] `.env.example` uses `VITE_API_BASE_URL=`
- [x] `npm run build` passes with no TypeScript errors
- [x] No regressions in existing server list / server detail endpoints

Status: COMPLETE

---

## Handoff to Next Task
After completing, run `/task-handoff`. Record:
- Which route files were created/modified
- Final env var name chosen
- Whether tags filtering required any Drizzle query changes
