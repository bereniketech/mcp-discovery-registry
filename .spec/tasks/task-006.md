---
task: 006
feature: mcp-discovery-registry
status: pending
depends_on: [003, 004]
---

# Task 006: Implement Voting, Favorites, and Tagging Endpoints

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /api-design
Commands: /verify, /task-handoff

---

## Objective
Build VoteService, FavoriteService, and TagService with toggle semantics. Implement all authenticated API endpoints for voting, favoriting, tagging, and listing user's favorites and submissions.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Vote/favorite: toggle semantics (POST creates or removes).
- Tags: lowercase-hyphenated format enforced.
- upvote_count on servers table must stay in sync with votes table.
- RLS policies enforce user-owned row access.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `server/src/services/vote.ts` — toggle vote (insert or delete), update servers.upvote_count atomically.
2. Create `server/src/services/favorite.ts` — toggle favorite (insert or delete).
3. Create `server/src/services/tag.ts` — create tag (normalize to lowercase-hyphen), associate with server, prevent duplicate association, update usage_count.
4. Add routes: `POST /api/v1/servers/:id/vote`, `POST /api/v1/servers/:id/favorite`, `POST /api/v1/servers/:id/tags`.
5. Add routes: `GET /api/v1/me/favorites`, `GET /api/v1/me/submissions`.
6. All write endpoints require auth middleware.
7. Write unit tests for toggle logic and tag normalization.
8. Write integration tests for all endpoints.

_Requirements: 8, 9_
_Skills: /code-writing-software-development — service layer, toggle logic; /api-design — REST semantics for toggles_

---

## Acceptance Criteria
- [ ] Vote POST creates vote if none exists, removes if already voted (toggle)
- [ ] servers.upvote_count stays in sync with actual vote count
- [ ] Favorite POST toggles correctly
- [ ] Tag POST creates and associates tag; enforces lowercase-hyphen format
- [ ] Duplicate tag on same server returns 409
- [ ] GET /me/favorites returns current user's favorited servers
- [ ] GET /me/submissions returns current user's submitted servers
- [ ] All write endpoints return 401 for unauthenticated requests
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
