---
task: 010
feature: mcp-discovery-registry
status: completed
depends_on: [004, 006, 008]
---

# Task 010: Build Server Detail Page with Config Generator

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Build the full server detail page with rendered README (sanitized Markdown), tool schema display, GitHub stats, maintenance warning, config generator with clipboard copy, vote/favorite buttons with optimistic updates, and tag input with autocomplete.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- README rendered with react-markdown + DOMPurify for XSS prevention.
- Config generator supports Claude Desktop and Cursor targets.
- Optimistic UI for vote/favorite toggles.
- "Potentially unmaintained" warning for repos with last_commit_at > 90 days ago.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Create `client/src/pages/ServerDetail.tsx` — fetch server by slug, render full profile.
2. Install react-markdown, remark-gfm, rehype-highlight, dompurify. Render README with syntax highlighting and sanitization.
3. Create tool schema display section — list tools with expandable input/output schemas.
4. Create GitHub stats badges section (stars, forks, open issues, last commit).
5. Add "Potentially unmaintained" warning banner when last_commit_at > 90 days ago.
6. Create `client/src/components/ConfigGenerator.tsx` — dropdown to select target (Claude Desktop / Cursor), generate mcpServers JSON, copy to clipboard via navigator.clipboard.writeText.
7. Create vote and favorite buttons with optimistic UI updates (immediate UI change, rollback on error).
8. Create `client/src/components/TagInput.tsx` — autocomplete input, add tag via POST, enforce format.
9. Ensure SEO-friendly URL structure (/servers/:slug).

_Requirements: 4, 5, 8, 9_
_Skills: /build-website-web-app — detail page, Markdown rendering; /code-writing-software-development — clipboard API, optimistic updates_

---

## Acceptance Criteria
- [x] README renders with proper Markdown formatting and syntax-highlighted code blocks
- [x] All Markdown is sanitized (no XSS via README content)
- [x] Tool schemas displayed with expandable details
- [x] GitHub stats (stars, forks, issues, last commit) shown
- [x] "Potentially unmaintained" warning appears for repos stale >90 days
- [x] Config generator copies valid mcpServers JSON for Claude Desktop and Cursor
- [x] Vote/favorite buttons toggle with optimistic UI
- [x] Tags addable via autocomplete input
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:** client/src/pages/ServerDetail.tsx, client/src/components/ConfigGenerator.tsx, client/src/components/TagInput.tsx, client/src/App.tsx, client/src/lib/api.ts, client/src/index.css, client/package.json, package-lock.json, .spec/tasks/task-010.md
**Decisions made:** Implemented a full detail route component at `/servers/:slug` with optimistic vote/favorite actions, README rendering via `react-markdown` + `remark-gfm` + `rehype-highlight`, and sanitization through `dompurify`; built a config generator that outputs `mcpServers` JSON for Claude Desktop and Cursor and copies via Clipboard API; added tool-schema accordion rendering from API payload when available and README JSON code-block fallback parsing when not.
**Context for next task:** Detail page now loads server metadata by slug, shows stale-maintenance warning when `lastCommitAt` is older than 90 days, supports tag addition with autocomplete suggestions and slug-format enforcement, and includes GitHub stats + taxonomy chips in a responsive layout.
**Open questions:** Backend currently does not expose persisted tool schema fields on server records; UI supports API-provided schemas when present and falls back to extracting likely schemas from README JSON blocks.

Status: COMPLETE
Completed: 2026-04-24T00:00:00Z
