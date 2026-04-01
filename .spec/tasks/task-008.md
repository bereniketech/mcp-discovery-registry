---
task: 008
feature: mcp-discovery-registry
status: completed
depends_on: [001]
---

# Task 008: Build React Frontend Shell and Routing

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Scaffold the React + Vite + TailwindCSS frontend app. Set up React Router with all page routes, create the responsive layout shell (header, sidebar, main content), initialize the Supabase client for auth, and create the API client module.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-1: Monorepo — client is at `client/` with its own package.json.
- Routes: `/` (home), `/servers/:slug` (detail), `/submit`, `/profile`, `/category/:slug`.
- Supabase client initialized with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Scaffold Vite + React + TypeScript in `client/` (if not already done in task-001).
2. Install and configure TailwindCSS v4.
3. Set up React Router v6 with routes: `/`, `/servers/:slug`, `/submit`, `/profile`, `/category/:slug`.
4. Create `client/src/components/layout/Header.tsx` — logo, search input placeholder, auth button placeholder.
5. Create `client/src/components/layout/Sidebar.tsx` — category navigation placeholder.
6. Create `client/src/components/layout/Layout.tsx` — responsive shell wrapping Header + Sidebar + main content.
7. Create placeholder page components for each route.
8. Create `client/src/lib/supabase.ts` — Supabase client initialization.
9. Create `client/src/lib/api.ts` — API client with typed methods for all backend endpoints.
10. Verify responsive layout works from 375px to 1920px+.

_Requirements: 11_
_Skills: /build-website-web-app — React + Vite + Tailwind, routing, responsive layout; /code-writing-software-development — API client module_

---

## Acceptance Criteria
- [x] `npm run dev` in client starts Vite dev server
- [x] All 5 routes render their placeholder pages
- [x] Layout is responsive: sidebar collapses on mobile, stacks on narrow viewports
- [x] Supabase client initializes without errors
- [x] API client module exports typed methods for all endpoints
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:** client/src/App.tsx, client/src/index.css, client/src/vite-env.d.ts, client/package.json, client/src/components/layout/Header.tsx, client/src/components/layout/Sidebar.tsx, client/src/components/layout/Layout.tsx, client/src/pages/HomePage.tsx, client/src/pages/ServerDetailPage.tsx, client/src/pages/SubmitPage.tsx, client/src/pages/ProfilePage.tsx, client/src/pages/CategoryPage.tsx, client/src/lib/supabase.ts, client/src/lib/api.ts, .spec/tasks/task-008.md
**Decisions made:** Implemented a route-shell architecture with nested routes under a reusable layout; used CSS-driven responsive collapse for sidebar without adding extra dependencies; added an API client class with typed methods for all current backend endpoints and auth token support; initialized Supabase as nullable when env vars are missing so app boot remains stable in local/dev environments.
**Context for next task:** Routing, layout scaffolding, API module, and Supabase client are ready for real data wiring; pages are placeholders and can now consume apiClient methods; sidebar links currently use placeholder categories and can be replaced by API-driven category data.
**Open questions:** Task step 2 mentions TailwindCSS v4, but workspace currently uses TailwindCSS v3.4.x. Implementation follows existing project version to avoid cross-task dependency churn.
