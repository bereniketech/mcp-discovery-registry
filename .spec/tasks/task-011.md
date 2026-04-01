---
task: 011
feature: mcp-discovery-registry
status: pending
depends_on: [006, 008]
---

# Task 011: Build Authentication Flow and User Profile

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Implement GitHub OAuth sign-in/sign-out via Supabase Auth, auth state management via React context, user profile page with favorites and submissions, and auth guards that redirect unauthenticated users on write actions.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- ADR-3: Supabase Auth with GitHub OAuth provider.
- Auth state managed via React context wrapping the app.
- Protected actions: vote, favorite, submit, tag — redirect to sign-in if unauthenticated.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `client/src/contexts/AuthContext.tsx` — Supabase auth state listener, provide user/session to children.
2. Create `client/src/components/AuthButton.tsx` — sign in (Supabase signInWithOAuth GitHub), sign out, show avatar when signed in.
3. Wire AuthButton into Header component.
4. Create `client/src/pages/Profile.tsx` — display user avatar, username, email. List favorites (GET /me/favorites) and submissions (GET /me/submissions).
5. Create `client/src/hooks/useAuth.ts` — convenience hook to access auth context.
6. Implement auth guards: wrap vote/favorite/submit/tag actions to check auth state, redirect to sign-in if unauthenticated.
7. Handle OAuth callback redirect.
8. Write component tests for AuthButton (signed in/out states).

_Requirements: 6, 8_
_Skills: /build-website-web-app — auth UI, protected routes; /code-writing-software-development — auth context, guards_

---

## Acceptance Criteria
- [ ] GitHub OAuth sign-in flow works end-to-end (click sign in -> GitHub -> redirect back -> signed in)
- [ ] Sign-out clears session and updates UI
- [ ] User profile page shows avatar, username from GitHub
- [ ] Favorites list fetches and displays correctly
- [ ] Submissions list fetches and displays correctly
- [ ] Unauthenticated users redirected to sign-in when attempting write actions
- [ ] Auth state persists across page refreshes (Supabase session)
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_
