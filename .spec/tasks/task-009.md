---
task: 009
feature: mcp-discovery-registry
status: completed
depends_on: [005, 008]
---

# Task 009: Build Home Page with Search, Trending, and Categories

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Implement the home page with SearchBar (debounced, with filters), ServerCard component, TrendingSection, and CategorySidebar. Wire all components to the backend API for real-time search results.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Search debounce: 300ms delay before API call.
- ServerCard shows: name, description, stars, upvotes, tags, categories.
- Trending section on home page shows top 10.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `client/src/components/SearchBar.tsx` — text input with 300ms debounce, category dropdown, tag filter chips.
2. Create `client/src/components/ServerCard.tsx` — card displaying name, description, github_stars, upvote_count, tags, category badges.
3. Create `client/src/components/TrendingSection.tsx` — horizontal scrollable list of top trending servers.
4. Populate `client/src/components/layout/Sidebar.tsx` with real categories from `GET /api/v1/categories`.
5. Create `client/src/hooks/useSearch.ts` — custom hook managing search state, debounce, and API calls.
6. Create `client/src/hooks/useTrending.ts` — fetch trending servers on mount.
7. Wire home page (`client/src/pages/Home.tsx`) to display TrendingSection + search results grid.
8. Implement "no results" state with suggested categories.
9. Ensure mobile layout: stacked cards, collapsible sidebar.

_Requirements: 1, 2, 3, 11_
_Skills: /build-website-web-app — components, responsive layout; /code-writing-software-development — data fetching hooks_

---

## Acceptance Criteria
- [x] Search returns results as user types (debounced)
- [x] Category sidebar filters results when clicked
- [x] Tag filter narrows results
- [x] Trending section shows top servers from API
- [x] ServerCard displays all required fields
- [x] "No results" message shows with suggested categories
- [x] Layout works on mobile (375px) and desktop (1920px+)
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:** client/src/lib/api.ts, client/src/hooks/useSearch.ts, client/src/hooks/useTrending.ts, client/src/components/SearchBar.tsx, client/src/components/ServerCard.tsx, client/src/components/TrendingSection.tsx, client/src/components/layout/Sidebar.tsx, client/src/pages/HomePage.tsx, client/src/index.css, bug-log.md, .spec/tasks/task-009.md
**Decisions made:** Implemented home search as a debounced (300ms) hook-backed flow against `GET /api/v1/servers`; used URL query param `category` on `/` so sidebar category clicks filter home results without route churn; loaded trending via `GET /api/v1/trending?limit=10`; added API category method with graceful fallback to derive categories from server listings when `/api/v1/categories` is unavailable.
**Context for next task:** Home now renders a real discovery experience with search, tag/category filters, trending strip, result cards, no-results suggestions, and responsive behavior; sidebar category links are dynamic and API-backed with fallback resilience.
**Open questions:** Task step references `GET /api/v1/categories`, but current backend routes expose no categories endpoint; client currently supports this via fallback derivation from `listServers` until backend endpoint is added.
