---
task: 004
feature: mcp-discovery-registry
status: done
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
- [x] POST with valid GitHub URL creates server with all fetched metadata
- [x] POST with duplicate GitHub URL returns 409 with DUPLICATE_SERVER error
- [x] POST with invalid/inaccessible URL returns 400/502 with clear error
- [x] GET /servers/:slug returns full server profile with categories and tags
- [x] GET /servers/:slug for nonexistent slug returns 404
- [x] Slug is URL-friendly (lowercase, hyphenated)
- [x] GitHub API errors handled gracefully (retry + fallback)
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:**
- `server/src/services/github-fetcher.ts` — GitHub metadata fetching with URL parsing, retry logic, and fallback behavior for README/commit failures.
- `server/src/services/server.ts` — server create/getBySlug/list service layer with duplicate detection, slug generation, and category/tag hydration.
- `server/src/routes/servers.ts` — POST/GET routes with auth, write-rate limit, body/query validation, and standardized payload shape.
- `server/src/schemas/server.ts` — Zod schemas for POST body and list pagination query params.
- `server/src/services/github-fetcher.test.ts` — unit tests for success, retry, 404, and rate-limit paths.
- `server/src/routes/servers.test.ts` — route integration tests for auth, create, duplicate, and get-by-slug behavior.
- `server/src/db/schema.ts` — renamed `repository_url` to `github_url` and added GitHub metadata columns.
- `server/migrations/0002_server_github_metadata.sql` — migration renaming URL column, adding metadata columns, and adding unique constraint.
- `server/migrations/meta/_journal.json` — migration metadata updated for `0001` and `0002`.
- `server/src/index.ts` — wired server route factory and service dependencies into app bootstrap.
- `shared/src/types/server.ts`, `client/src/App.tsx` — aligned shared/client Server shape with `githubUrl` and metadata fields.

**Decisions made:**
- Route module uses dependency injection (`createServersRouter(service)`) to prevent import-time DB/config side effects and simplify testing.
- Duplicate server protection is enforced in two layers: service pre-check and DB-level unique constraint on `github_url`.
- GitHub fetch behavior retries retryable errors (`429`, `5xx`) up to 3 times with incremental backoff; README/commit fetch failures degrade gracefully to `null`.

**Context for next task:**
- `/api/v1/servers` now supports pagination (`page`, `per_page`) and returns `data + meta`; search/filter/sort can be layered in Task 005 over `ServerService.list`.
- `ServerService` currently returns category/tag slugs; ensure upcoming UI contracts expect slugs or add mappers.
- Shared `Server` type now includes `githubStars`, `githubForks`, `openIssues`, and `lastCommitAt`.

**Open questions:**
- The design spec also mentions tool schemas/install/config fields not present in DB yet; confirm whether those arrive in a later migration/task.
