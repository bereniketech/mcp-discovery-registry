---
task: 003
feature: mcp-discovery-registry
status: done
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
- [x] `npm run dev` starts server without errors
- [x] `GET /api/v1/health` returns 200 `{ status: "ok" }`
- [x] Auth middleware rejects requests with invalid/missing JWT (401)
- [x] Auth middleware passes requests with valid Supabase JWT and attaches user
- [x] Rate limiter returns 429 when limits exceeded
- [x] CORS headers present in responses
- [x] Error middleware returns consistent JSON format for all errors
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:**
- `server/package.json` — added `cors`, `express-rate-limit`, `jose`, `@types/cors`; updated `dev`/`start` scripts to use `tsx watch` and `node dist/`
- `server/src/index.ts` — full Express app with JSON body parser, CORS, public rate limiter (100/min), health route, db wired via `app.locals`, centralized error handler
- `server/src/types/express.d.ts` — augments `Request` with `user?: { id, email }`
- `server/src/middleware/auth.ts` — `requireAuth`: verifies Supabase HS256 JWT via `jose`, attaches `req.user`, returns 401 on missing/invalid token
- `server/src/middleware/error.ts` — `errorHandler`: returns `{ error: { code, message, status } }`, never exposes stack traces
- `server/src/middleware/validate.ts` — `validateBody(schema)`: Zod middleware factory returning 422 with `details` array on failure
- `server/src/routes/health.ts` — `GET /api/v1/health` → `{ status: "ok" }`
- `server/src/middleware/auth.test.ts` — 4 unit tests: missing header, non-Bearer scheme, invalid token, valid token
- `.env.example` — added `SUPABASE_JWT_SECRET`, `CORS_ORIGIN`, `PORT`

**Decisions made:**
- JWT library: `jose` (native ESM, supports HS256 with raw secret)
- JWT secret env var: `SUPABASE_JWT_SECRET`
- Write rate limiter (30/min) exported as `writeLimiter` from `index.ts` for route-level use
- Error handler swallows stack trace for 500s; passes through message for 4xx

**Context for next task:**
- Import `requireAuth` from `./middleware/auth.js` to protect routes
- Import `writeLimiter` from `../index.js` to apply write rate limits on mutating routes
- Import `validateBody` from `./middleware/validate.js` for request validation
- `app.locals['db']` provides the Drizzle client; or import `db` directly from `./db/index.js`

**Open questions:** none

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
