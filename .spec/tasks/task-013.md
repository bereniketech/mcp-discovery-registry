---
task: 013
feature: mcp-discovery-registry
status: pending
depends_on: [002, 004]
---

# Task 013: Implement Initial Seeding Script

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /postgres-patterns
Commands: /verify, /task-handoff

---

## Objective
Build a CLI seeding script that imports 100+ MCP servers from the official MCP registry and GitHub search. Each imported server should have full metadata, README, and at least one category assigned.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Seeder reuses GitHubFetcherService from task-004.
- Auto-categorization: keyword matching on description (e.g., "database" -> Databases, "slack" -> Communication).
- Bulk inserts via Drizzle for performance.
- Must respect GitHub API rate limits (5000/hr authenticated).

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/services/seeder.ts` — SeederService class.
2. Implement source fetching: scrape/API-call official MCP registry listing, GitHub search for "mcp-server" topic repos.
3. Implement auto-categorization: keyword map (description patterns -> category slugs).
4. Implement bulk import: for each server, fetch metadata via GitHubFetcherService, generate slug, assign categories, insert via Drizzle.
5. Handle duplicates gracefully (skip if github_url already exists).
6. Add progress logging (imported X of Y, skipped Z duplicates).
7. Create `server/src/scripts/seed.ts` — CLI entry point.
8. Add `npm run seed` script to server/package.json.
9. Test with a small batch first (10 servers), then full run.

_Requirements: 10_
_Skills: /code-writing-software-development — script, GitHub API batch calls; /postgres-patterns — bulk inserts_

---

## Acceptance Criteria
- [ ] `npm run seed` imports 100+ MCP servers
- [ ] Each server has: name, description, github_url, README, stars, last_commit_at
- [ ] Each server has at least one category assigned
- [ ] No duplicate servers (skips existing github_urls)
- [ ] search_vector populated for all imported servers (via trigger)
- [ ] Progress logged to console
- [ ] GitHub rate limits respected (batching with delays)
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
