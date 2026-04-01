---
task: 012
feature: mcp-discovery-registry
status: pending
depends_on: [004, 011]
---

# Task 012: Build Server Submission Flow

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Build the server submission page with GitHub URL input, validation, auto-fetched metadata preview, category selection, and submission. Handle error states for invalid URLs and duplicates.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- Submit flow: enter URL -> fetch preview -> select categories -> confirm submit.
- Auth required — redirect unauthenticated users.
- Backend handles all GitHub fetching; frontend shows preview from response.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `client/src/pages/Submit.tsx` — form with GitHub URL input, submit button.
2. Add URL format validation (must be valid GitHub repo URL).
3. On submit: call POST /api/v1/servers, show loading state while GitHub metadata fetches.
4. On success: show metadata preview (name, description, stars) and category multi-select.
5. On confirm: finalize submission, redirect to new server's detail page.
6. Handle errors: invalid URL (400), duplicate (409), GitHub unreachable (502) — display clear messages.
7. Require auth — redirect to sign-in if not authenticated.
8. Write component tests for SubmitForm states (empty, loading, preview, error).

_Requirements: 7_
_Skills: /build-website-web-app — form UI, validation states; /code-writing-software-development — form handling, error display_

---

## Acceptance Criteria
- [ ] Valid GitHub URL shows metadata preview after submission
- [ ] User can select categories before confirming
- [ ] Successful submission redirects to new server profile page
- [ ] Duplicate URL shows "This server is already registered" error
- [ ] Invalid URL shows validation error
- [ ] Loading state shown while metadata is being fetched
- [ ] Unauthenticated users redirected to sign-in
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
