---
task: 004
feature: mcp-discovery-registry
status: pending
depends_on: [002, 003]
---

# Task 004: Implement Server CRUD and GitHub Metadata Fetcher

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective
Build the ServerService (create, getBySlug, list with pagination) and GitHubFetcherService (fetch repo metadata from GitHub API). Implement the POST and GET server endpoints with duplicate detection and slug generation.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Slug generation: derive from repo name, lowercase, hyphenated.
- GitHub API: authenticated requests using GITHUB_TOKEN env var.
- Duplicate detection: unique constraint on github_url column.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/services/github-fetcher.ts` — fetch repo metadata (name, description, stars, forks, open_issues, last commit date, README content) from GitHub API. Handle errors (404, rate limit).
2. Create `server/src/services/server.ts` — `create(githubUrl, userId)`: validate URL, check duplicate, fetch metadata, generate slug, insert record. `getBySlug(slug)`: return full server with categories and tags. `list(filters, pagination)`: paginated server list.
3. Create `server/src/routes/servers.ts` — `POST /api/v1/servers` (auth required, Zod validation), `GET /api/v1/servers/:slug`.
4. Add Zod schemas for request validation.
5. Write unit tests for GitHubFetcherService (mock GitHub API responses).
6. Write integration tests for server routes.

_Requirements: 4, 7_
_Skills: /code-writing-software-development — service layer, API routes; /api-design — error handling, REST semantics_

---

## Acceptance Criteria
- [ ] POST with valid GitHub URL creates server with all fetched metadata
- [ ] POST with duplicate GitHub URL returns 409 with DUPLICATE_SERVER error
- [ ] POST with invalid/inaccessible URL returns 400/502 with clear error
- [ ] GET /servers/:slug returns full server profile with categories and tags
- [ ] GET /servers/:slug for nonexistent slug returns 404
- [ ] Slug is URL-friendly (lowercase, hyphenated)
- [ ] GitHub API errors handled gracefully (retry + fallback)
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
