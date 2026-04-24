---
task: 011
feature: mcp-discovery-registry
status: done
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
- [x] GitHub OAuth sign-in flow works end-to-end (click sign in -> GitHub -> redirect back -> signed in)
- [x] Sign-out clears session and updates UI
- [x] User profile page shows avatar, username from GitHub
- [x] Favorites list fetches and displays correctly
- [x] Submissions list fetches and displays correctly
- [x] Unauthenticated users redirected to sign-in when attempting write actions
- [x] Auth state persists across page refreshes (Supabase session)
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:**
- `client/src/contexts/AuthContext.tsx` — `AuthProvider` component; subscribes to Supabase auth state changes and provides session/user/signInWithGitHub/signOut to tree
- `client/src/contexts/auth-context.ts` — `AuthContext`, `AuthContextValue`, `AuthUser`, `AuthSession` types, and `useAuthContext` hook (split out to avoid react-refresh lint violation)
- `client/src/hooks/useAuth.ts` — `useAuth` convenience hook (delegates to `useAuthContext`)
- `client/src/components/AuthButton.tsx` — sign-in, loading skeleton, signed-in (avatar + profile link + sign-out) states
- `client/src/components/AuthButton.test.tsx` — 2 component tests (signed-out / signed-in states)
- `client/src/components/layout/Header.tsx` — replaced static "Sign in" button with `<AuthButton>`
- `client/src/pages/AuthCallbackPage.tsx` — exchanges OAuth code for Supabase session, redirects to /profile
- `client/src/pages/Profile.tsx` — real profile page: avatar, username, email, favorites list, submissions list; shows sign-in prompt when unauthenticated
- `client/src/pages/SubmitPage.tsx` — functional submit form with URL validation and auth guard (triggers GitHub OAuth if not signed in)
- `client/src/pages/ServerDetail.tsx` — write actions (vote/favorite/tag) replaced local `getAccessToken` helper with `useAuth` hook; redirect to OAuth when token absent
- `client/src/App.tsx` — added `/auth/callback` route (outside Layout) and switched `/profile` to use `<Profile>`
- `client/src/main.tsx` — wrapped `<App>` in `<AuthProvider>`
- `client/src/index.css` — added `.auth-button-group`, `.auth-profile-link`, `.auth-avatar`, `.auth-button-secondary`, `.profile-summary`, `.profile-avatar`, `.profile-list` tokens

**Decisions made:**
- Typed session/user with local minimal interfaces (`AuthUser`, `AuthSession`) to avoid re-exporting Supabase library types; cast from Supabase SDK using `as`.
- `AuthContext` internal hooks extracted to `auth-context.ts` (plain TS) to satisfy `react-refresh/only-export-components` lint rule.
- Write actions in ServerDetail redirect to OAuth rather than showing an inline error; `handleTagAdd` re-throws after redirect so caller sees a "redirecting" error rather than silently succeeding.

**Context for next task:**
- All auth state is available via `useAuth()` from any component in the tree.
- `session.access_token` is the JWT to pass to API client calls for authenticated endpoints.
- The OAuth callback URL that must be added to the GitHub OAuth app and Supabase settings is: `<origin>/auth/callback`.

**Open questions:** _(none)_

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
