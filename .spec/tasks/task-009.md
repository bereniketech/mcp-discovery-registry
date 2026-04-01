---
task: 009
feature: mcp-discovery-registry
status: pending
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
- [ ] Search returns results as user types (debounced)
- [ ] Category sidebar filters results when clicked
- [ ] Tag filter narrows results
- [ ] Trending section shows top servers from API
- [ ] ServerCard displays all required fields
- [ ] "No results" message shows with suggested categories
- [ ] Layout works on mobile (375px) and desktop (1920px+)
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
