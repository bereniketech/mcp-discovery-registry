---
task: 001
feature: mcp-discovery-registry
status: pending
depends_on: []
---

# Task 001: Initialize Monorepo, Shared Types, and Tooling

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /build-website-web-app
Commands: /verify, /task-handoff

---

## Objective
Set up the npm workspaces monorepo with `client/`, `server/`, and `shared/` packages. Configure TypeScript, ESLint, Prettier, and Vitest across all packages. Define shared type definitions for all domain entities and API response shapes.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-1: Monorepo with separate client/server packages using npm workspaces and a shared types package.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-001.

**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create root `package.json` with npm workspaces: `["client", "server", "shared"]`.
2. Create `shared/package.json` with name `@mcp-registry/shared`, add TypeScript.
3. Create `shared/src/types/` with type definitions: `Server`, `User`, `Category`, `Tag`, `Vote`, `Favorite`, `ApiResponse`, `PaginatedResponse`.
4. Create `server/package.json` with Express, Drizzle, Zod, dotenv dependencies. TypeScript config extending root.
5. Create `client/package.json` with React, Vite, TailwindCSS, React Router. TypeScript config extending root.
6. Create root `tsconfig.json` with project references.
7. Configure ESLint and Prettier at root level.
8. Add Vitest config for both client (`client/vitest.config.ts`) and server (`server/vitest.config.ts`).
9. Run `npm install` and verify all packages resolve.

_Requirements: all (foundational)_
_Skills: /code-writing-software-development — project structure, TypeScript config; /build-website-web-app — Vite scaffold_

---

## Acceptance Criteria
- [ ] `npm install` succeeds from root with no errors
- [ ] TypeScript compiles in all three packages (`npm run build` or `tsc --noEmit`)
- [ ] Shared types are importable from both client and server
- [ ] ESLint and Prettier run without errors
- [ ] Vitest runs (even with zero tests) in both client and server
- [ ] `/verify` passes

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
