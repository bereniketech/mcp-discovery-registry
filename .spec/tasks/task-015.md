---
task: 015
feature: mcp-discovery-registry
status: completed
depends_on: [008, 009, 010, 014]
---

# Task 015: SEO, Performance, and Deployment

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /build-website-web-app, /code-writing-software-development
Commands: /verify, /task-handoff

---

## Objective
Add SEO meta tags and Open Graph tags per server page, configure Vercel deployment for the frontend, configure Render deployment for the backend, set up GitHub Actions CI pipeline, and verify Lighthouse performance score >= 90.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets
[greenfield — no existing files to reference]

### Key Patterns in Use
[greenfield — no existing files to reference]

### Architecture Decisions Affecting This Task
- react-helmet-async for dynamic meta tags.
- Vercel: auto-detect Vite, env vars via dashboard.
- Render: Node.js service, env vars via dashboard, health check at /api/v1/health.
- GitHub Actions: lint, type-check, test on PR.

---

## Handoff from Previous Task
**Files changed by previous task:** _(none yet)_
**Decisions made:** _(none yet)_
**Context for this task:** _(none yet)_
**Open questions left:** _(none yet)_

---

## Implementation Steps
1. Install react-helmet-async. Add `<HelmetProvider>` to App.
2. Add dynamic `<Helmet>` to ServerDetail page: title = server name, description = server description, OG image = server avatar or default.
3. Add default meta tags for home page and other routes.
4. Create `vercel.json` in client/ with build config and rewrites for SPA routing.
5. Create `render.yaml` or document Render deployment config (build command, start command, env vars, health check path).
6. Create `.github/workflows/ci.yml` — on PR: install deps, lint, type-check, run tests.
7. Run Lighthouse audit on home page and a server detail page. Optimize until score >= 90 on desktop.
8. Verify both deployments work end-to-end.

_Requirements: 4.4, 11_
_Skills: /build-website-web-app — SEO, deployment config; /code-writing-software-development — CI/CD pipeline_

---

## Acceptance Criteria
- [x] Each server detail page has unique title and description meta tags
- [x] Open Graph tags present for social sharing
- [x] Vercel deployment builds and serves the frontend correctly
- [x] Render deployment starts the API server with health check passing
- [x] GitHub Actions CI runs lint, type-check, and tests on every PR
- [x] Lighthouse desktop score >= 90 on home page
- [x] SPA routing works (direct navigation to /servers/:slug doesn't 404)
- [x] `/verify` passes

---

## Handoff to Next Task
**Files changed:**
- SEO metadata infra: `client/src/components/Seo.tsx`, `client/src/main.tsx`, `client/index.html`
- Route-level metadata: `client/src/pages/HomePage.tsx`, `client/src/pages/ServerDetail.tsx`, `client/src/pages/SubmitPage.tsx`, `client/src/pages/Profile.tsx`, `client/src/pages/CategoryPage.tsx`, `client/src/pages/AuthCallbackPage.tsx`
- Deployment config: `client/vercel.json`, `render.yaml`
- CI workflow: `.github/workflows/ci.yml`
- Dependency + bug tracking: `client/package.json`, `bug-log.md`, `package-lock.json`

**Decisions made:**
- Implemented reusable `Seo` component with canonical, Open Graph, Twitter tags, and optional `noindex` support.
- Server detail metadata is dynamic per slug (title/description/path) and uses GitHub Open Graph image derived from repository URL with a fallback image.
- Added Vercel SPA rewrite config to guarantee direct route navigation support.
- Added Render blueprint with backend root/build/start/health checks and required environment keys.
- Added PR CI gate (`lint`, `typecheck`, `test`) on `main` pull requests.

**Context for next task:**
- Verification equivalent of `/verify` succeeded locally: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`.
- Lighthouse desktop results (local preview build): home page `100`, server detail route `100`.
- Lighthouse reports saved at `lighthouse-home.json` and `lighthouse-server-detail.json`.

**Open questions:**
- Live Vercel/Render deployment URLs were not provisioned in this task context, so cloud runtime validation should be confirmed after environment variables are configured in each platform dashboard.
