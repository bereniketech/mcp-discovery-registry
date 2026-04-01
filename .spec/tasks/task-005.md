---
task: 005
feature: mcp-discovery-registry
status: pending
depends_on: [002, 003]
---

# Task 005: Implement Search Service with Full-Text Search

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /postgres-patterns
Commands: /verify, /task-handoff

---

## Objective
Build the SearchService using PostgreSQL full-text search (ts_query, ts_rank). Implement the GET /api/v1/servers endpoint with search query, category filter, tag filter, sort options, and pagination. Implement composite ranking.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-2: PostgreSQL tsvector + GIN for search. search_vector auto-updated by trigger.
- Composite ranking: weighted sum of text relevance + upvotes + stars + recency.
- Sort options: trending, newest, stars, votes.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/services/search.ts` — build ts_query from user input, execute against search_vector with ts_rank scoring.
2. Implement composite ranking function: `score = ts_rank * weight + upvote_count * 2 + github_stars * 1 + recency_bonus`.
3. Add query params to GET /api/v1/servers: `q` (search text), `category` (slug), `tags[]` (array), `sort` (trending|newest|stars|votes), `page`, `per_page` (default 20, max 100).
4. Implement category filtering via JOIN on server_categories.
5. Implement tag filtering via JOIN on server_tags + tags.
6. Return paginated response with `{ data: [...], meta: { page, total, per_page } }`.
7. Handle empty query (return all servers with chosen sort).
8. Write unit tests for search query building and ranking.
9. Write integration tests for search endpoint with various filter combinations.

_Requirements: 1, 2, 3_
_Skills: /code-writing-software-development — search logic; /postgres-patterns — full-text search queries, ranking_

---

## Acceptance Criteria
- [ ] Search with `q` param returns results ranked by relevance across name, description, README
- [ ] Category filter returns only servers in that category
- [ ] Tag filter returns only servers with all specified tags
- [ ] Sort options work correctly (trending, newest, stars, votes)
- [ ] Pagination returns correct page, total, and per_page in meta
- [ ] Empty query returns all servers sorted by chosen sort
- [ ] Search results return within 500ms for p95
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
