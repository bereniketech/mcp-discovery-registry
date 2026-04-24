---
task: 007
feature: mcp-discovery-registry
status: completed
depends_on: [005]
---

# Task 007: Implement Trending Service and Endpoint

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /postgres-patterns
Commands: /verify, /task-handoff

---

## Objective
Build the TrendingService with a time-decay scoring algorithm and implement the GET /api/v1/trending endpoint returning the top 10 trending servers.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Scoring formula: `score = (upvotes * 2) + (stars * 1) + recency_bonus` where recency_bonus decays over 30 days.
- Trending is a computed query, not a stored column (keeps data fresh).

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/services/trending.ts` — compute trending score using SQL: `(upvote_count * 2) + (github_stars) + (30 - LEAST(EXTRACT(DAY FROM NOW() - last_commit_at), 30)) * 3`.
2. Implement `getTopTrending(limit = 10)` — returns servers ordered by trending score descending.
3. Add route: `GET /api/v1/trending` with optional `limit` query param.
4. Add response caching (60s TTL) to reduce query load.
5. Write unit tests for scoring logic.
6. Write integration test for trending endpoint.

_Requirements: 3_
_Skills: /code-writing-software-development — scoring algorithm; /postgres-patterns — computed SQL queries_

---

## Acceptance Criteria
- [x] GET /api/v1/trending returns servers ordered by composite trending score
- [x] Recently active servers with fewer stars rank higher than stale servers with more stars
- [x] Default limit is 10, configurable via query param
- [x] Response is cached for 60s
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:** server/src/services/trending.ts, server/src/routes/trending.ts, server/src/index.ts, server/src/services/trending.test.ts, server/src/routes/trending.test.ts, .spec/tasks/task-007.md, bug-log.md
**Decisions made:** Trending score is computed live in SQL from votes, stars, and 30-day recency decay (`last_commit_at`, fallback `created_at`); endpoint caches per-limit responses for 60s in-memory using route-local Map.
**Context for next task:** Trending endpoint is mounted at `/api/v1/trending` with optional `limit` query param (default 10, min 1, max 100). Unit tests validate score weighting/recency behavior and route tests validate limit handling + cache hit behavior.
**Open questions:** None.

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
