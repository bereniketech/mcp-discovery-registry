---
task: 017
feature: mcp-discovery-registry
status: open
priority: P1
depends_on: [016]
---

# Task 017: P1 — CategoryPage, Header Search Wiring, Write Rate Limiting

## Skills
- `.kit/skills/frameworks-frontend/react-patterns/SKILL.md`
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/core/task-handoff.md`
- `.kit/commands/development/refactor-clean.md`

---

## Objective
Three P1 gaps that break core user journeys:
1. `CategoryPage` at `/category/:slug` shows a stub or is missing — needs real server listing wired to `GET /api/v1/servers?category=<slug>`.
2. Header search input is a visual stub — typing does not update search state or navigate.
3. `writeLimiter` rate-limiting middleware exists but is not applied to server-action routes (submit, vote, favorite, tag).

---

## Codebase Context

### Files to Read First
- `client/src/pages/CategoryPage.tsx` (or equivalent) — check if stub
- `client/src/components/Header.tsx` — find search input, check if wired
- `client/src/` — find global search state (Context, Zustand, or URL param approach)
- `server/src/middleware/` — find `writeLimiter` or rate limiting middleware
- `server/src/routes/server-actions.ts` (or equivalent) — vote, favorite, submit, tag routes

---

## Implementation Steps

### Feature 1 — Implement CategoryPage
1. Route: confirm `/category/:slug` is registered in React Router (`client/src/App.tsx` or router config).
2. In `CategoryPage`:
   - Extract `slug` from `useParams()`.
   - Call `GET /api/v1/categories` on mount to get category name for page title (or derive from slug).
   - Call `GET /api/v1/servers?category=<slug>&sort=popular&page=<n>` with pagination state.
   - Render `ServerCard` list with loading skeleton and empty state.
   - Add `<title>` and Open Graph tags using the category name.
3. Pagination: reuse existing pagination component if present; add if not. Show page controls when total > per_page.
4. Server-side: confirm `GET /api/v1/servers` accepts `category` param and joins `server_categories`. Fix if not.

### Feature 2 — Wire Header search input to search state
1. Determine state approach:
   - If search state is URL-driven (`?q=`): `useNavigate` on input change (debounced 300ms) to navigate to `/` or `/search` with updated `q` param.
   - If search state is React context/store: dispatch to search state on input change.
2. On the search results page, read `q` from URL params and pass to `GET /api/v1/servers?q=<term>`.
3. Header input should reflect current `q` param when on search page (controlled input synced to URL).
4. Add keyboard shortcut: pressing `/` focuses the search input (standard pattern for discovery UIs).
5. On mobile: ensure the search input is accessible (collapsible or inline — match existing mobile nav pattern).

### Feature 3 — Apply writeLimiter to server-action routes
1. Locate `writeLimiter` middleware (likely `express-rate-limit` instance, 30 req/min per user).
2. Apply to ALL write routes:
   - `POST /api/v1/servers` (submit)
   - `POST /api/v1/servers/:id/vote`
   - `POST /api/v1/servers/:id/favorite`
   - `POST /api/v1/servers/:id/tags`
   - `DELETE` equivalents if any
3. Placement: apply at router level (not per-route) to avoid missing any new write routes added later.
4. Verify the 30 req/min limit matches design.md spec. Adjust if not.
5. Add test: send 31 requests to a write endpoint, verify 429 on the 31st.

---

## Acceptance Criteria
- [ ] `/category/databases` (or any valid slug) renders a real server list — not a stub
- [ ] CategoryPage shows category name as page heading and in `<title>`
- [ ] CategoryPage has working pagination when total > 20
- [ ] Typing in Header search navigates/filters results; debounce prevents request-per-keystroke
- [ ] Header search input reflects current query when page loads with `?q=` param
- [ ] All 4 write route groups have `writeLimiter` applied
- [ ] 31st write request within 1 minute returns HTTP 429
- [ ] `npm run build` passes; no console errors in browser

---

## Handoff to Next Task
After completing, run `/task-handoff`. Record:
- Search state approach chosen (URL vs context)
- Which route file writeLimiter was applied to (router-level or individual routes)
- CategoryPage component path
