---
task: 014
feature: mcp-discovery-registry
status: pending
depends_on: [003, 004, 005, 006, 007, 008, 009, 010, 011, 012]
---

# Task 014: Write Tests and Achieve Coverage Targets

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /tdd-workflow, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Write comprehensive tests to achieve 80%+ coverage on server services and 70%+ on client components. Includes unit tests, integration tests, component tests, and E2E tests for critical flows.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Vitest for unit and integration tests (both client and server).
- React Testing Library for component tests.
- Playwright for E2E tests.
- Test Supabase instance for integration tests.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. **Server unit tests**: SearchService (query building, ranking), VoteService (toggle logic), TrendingService (scoring), GitHubFetcherService (API response parsing), TagService (normalization).
2. **Server integration tests**: All API routes — auth required/not, CRUD, search with filters, voting toggle, favorites, tagging. Use test Supabase instance or mocked DB.
3. **Client component tests**: SearchBar (debounce, filter interaction), ServerCard (rendering all fields), ConfigGenerator (JSON generation, clipboard), AuthButton (signed in/out states).
4. **E2E tests** (Playwright): search flow (type query -> see results), server detail (navigate -> see README -> copy config), submit server (enter URL -> preview -> submit), vote/favorite (click -> see count update).
5. Add coverage reporting to Vitest config.
6. Verify coverage: 80%+ server, 70%+ client.
7. Add test scripts to root package.json: `test`, `test:server`, `test:client`, `test:e2e`, `test:coverage`.

_Requirements: all_
_Skills: /tdd-workflow — test structure, coverage targets; /code-writing-software-development — Vitest, RTL, Playwright_

---

## Acceptance Criteria
- [ ] Server service unit tests pass with 80%+ coverage
- [ ] Client component tests pass with 70%+ coverage
- [ ] Integration tests cover all API routes (happy path + error cases)
- [ ] E2E tests pass for: search, server detail, submit, vote/favorite
- [ ] `npm test` runs all test suites from root
- [ ] Coverage report generated
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
