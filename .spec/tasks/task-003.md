---
task: 003
feature: mcp-discovery-registry
status: pending
depends_on: [001, 002]
---

# Task 003: Build Express API Server with Auth Middleware

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective
Set up the Express API server with TypeScript, Zod request validation, centralized error handling, CORS configuration, rate limiting, Supabase JWT auth middleware, and a health check endpoint. Wire up the Drizzle client.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-3: Supabase Auth — JWT verification using Supabase JWT secret.
- Error response format: `{ error: { code, message, status } }`.
- Rate limits: 100 req/min public, 30 req/min writes per user.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/index.ts` — Express app with JSON body parser, CORS, and rate limiting (express-rate-limit).
2. Create `server/src/middleware/auth.ts` — verify Supabase JWT from Authorization header, attach user to request.
3. Create `server/src/middleware/error.ts` — centralized error handler returning `{ error: { code, message, status } }`.
4. Create `server/src/middleware/validate.ts` — Zod schema validation middleware factory.
5. Create `server/src/routes/health.ts` — `GET /api/v1/health` returning `{ status: "ok" }`.
6. Wire Drizzle client from task-002 into app context.
7. Add npm scripts: `dev` (nodemon/tsx watch), `build`, `start`.
8. Write unit tests for auth middleware (valid token, invalid token, missing token).

_Requirements: 6_
_Skills: /code-writing-software-development — Express setup, middleware patterns; /api-design — REST conventions, error format_

---

## Acceptance Criteria
- [ ] `npm run dev` starts server without errors
- [ ] `GET /api/v1/health` returns 200 `{ status: "ok" }`
- [ ] Auth middleware rejects requests with invalid/missing JWT (401)
- [ ] Auth middleware passes requests with valid Supabase JWT and attaches user
- [ ] Rate limiter returns 429 when limits exceeded
- [ ] CORS headers present in responses
- [ ] Error middleware returns consistent JSON format for all errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
