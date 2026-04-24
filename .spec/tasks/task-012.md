---
task: 012
feature: mcp-discovery-registry
status: done
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
- [x] Valid GitHub URL shows metadata preview after submission
- [x] User can select categories before confirming
- [x] Successful submission redirects to new server profile page
- [x] Duplicate URL shows "This server is already registered" error
- [x] Invalid URL shows validation error
- [x] Loading state shown while metadata is being fetched
- [x] Unauthenticated users redirected to sign-in
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:**
- `client/src/pages/SubmitPage.tsx` — implemented two-step submit flow (preview -> category select -> confirm), URL validation, auth gate, and error mapping for invalid URL / duplicate / GitHub unavailable.
- `client/src/pages/SubmitPage.test.tsx` — added component tests for invalid input, loading preview, preview rendering, duplicate error, and unauthenticated sign-in redirect.
- `client/src/lib/api.ts` — added `previewServer()` API call and extended `createServer()` to send selected category slugs.
- `server/src/schemas/server.ts` — extended create schema with optional `categories` and added preview request schema.
- `server/src/routes/servers.ts` — added `POST /api/v1/servers/preview` and wired `categories` through create endpoint.
- `server/src/services/server.ts` — added preview metadata method with duplicate detection and category attachment during create.
- `server/src/routes/servers.test.ts` — added preview route test and updated create route expectations for category payload.

**Decisions made:**
- Kept backend-owned GitHub fetch behavior by introducing a dedicated authenticated preview endpoint (`POST /servers/preview`) instead of client-side GitHub fetches.
- Preserved existing create endpoint and made category assignment optional via `categories: string[]` in the same request.
- Category validation is strict on create: unknown category slugs return `422 invalid_categories`.
- Duplicate detection runs in both preview and create to keep UX fast while still handling race conditions safely.

**Context for next task:**
- Submit flow is now: URL input -> preview fetch -> category selection -> confirm create -> navigate to `/servers/:slug`.
- Frontend error copy is user-facing and normalized from API error codes in `mapSubmissionError`.
- Full repo verification (`npm run typecheck`, `npm run lint`, `npm run test`) passes.

**Open questions:** _(none)_

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
