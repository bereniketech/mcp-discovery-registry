# Implementation Plan: MCP Discovery Registry

- [ ] 1. Initialize monorepo, shared types, and tooling
  - Set up npm workspaces with `client/`, `server/`, and `shared/` packages.
  - Configure TypeScript, ESLint, Prettier across all packages.
  - Add Vitest config for both client and server.
  - Create shared type definitions for Server, User, Category, Tag, Vote, Favorite, API responses.
  - _Requirements: all (foundational)_
  - _Skills: /code-writing-software-development, /build-website-web-app_
  - **AC:** `npm install` succeeds from root. TypeScript compiles in all packages. Shared types importable from client and server.

- [ ] 2. Set up Supabase schema and Drizzle ORM
  - Define Drizzle schema for all tables: users, servers, categories, server_categories, votes, favorites, tags, server_tags.
  - Create initial migration with all tables, indexes, constraints, and RLS policies.
  - Add search_vector column with GIN index and trigger for auto-update.
  - Seed default categories.
  - _Requirements: 2, 3, 4, 8, 9, 10_
  - _Skills: /postgres-patterns, /database-migrations_
  - **AC:** Migration runs against Supabase. All tables created with correct constraints. RLS policies active. Categories seeded. search_vector trigger fires on insert/update.

- [ ] 3. Build Express API server with auth middleware
  - Set up Express with TypeScript, Zod validation, error middleware, CORS, rate limiting.
  - Implement Supabase JWT verification middleware.
  - Create health check endpoint.
  - Wire up Drizzle client to Supabase PostgreSQL.
  - _Requirements: 6_
  - _Skills: /code-writing-software-development, /api-design_
  - **AC:** Server starts. Health check returns 200. Auth middleware rejects invalid tokens. Rate limiter blocks excess requests.

- [ ] 4. Implement server CRUD and GitHub metadata fetcher
  - Build ServerService with create, getBySlug, list with pagination.
  - Build GitHubFetcherService for repo metadata.
  - Implement POST /api/v1/servers and GET /api/v1/servers/:slug.
  - Implement duplicate detection.
  - _Requirements: 4, 7_
  - _Skills: /code-writing-software-development, /api-design_
  - **AC:** Submitting a GitHub URL creates a server with fetched metadata. Duplicate returns 409. Server profile returns all fields.

- [ ] 5. Implement search service with full-text search
  - Build SearchService using PostgreSQL ts_query and ts_rank.
  - Implement GET /api/v1/servers with query, category, tags, sort, pagination.
  - Implement composite ranking.
  - _Requirements: 1, 2, 3_
  - _Skills: /code-writing-software-development, /postgres-patterns_
  - **AC:** Search returns ranked results. Category and tag filters work. Pagination correct. Empty query returns all servers.

- [ ] 6. Implement voting, favorites, and tagging endpoints
  - Build VoteService, FavoriteService, TagService.
  - Implement toggle endpoints and list endpoints.
  - _Requirements: 8, 9_
  - _Skills: /code-writing-software-development, /api-design_
  - **AC:** Vote toggles correctly. Favorites toggle and list. Tags enforce format. All endpoints require auth.

- [ ] 7. Implement trending service and endpoint
  - Build TrendingService with time-decay scoring.
  - Implement GET /api/v1/trending.
  - _Requirements: 3_
  - _Skills: /code-writing-software-development, /postgres-patterns_
  - **AC:** Trending returns servers ordered by composite score. Recent activity ranks higher.

- [ ] 8. Build React frontend shell and routing
  - Scaffold React + Vite + TailwindCSS in client/.
  - Set up React Router with all routes.
  - Create layout with header, sidebar, main content.
  - Set up Supabase client and API client module.
  - _Requirements: 11_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** App renders. All routes load. Responsive 375px-1920px. Supabase auth initialized.

- [ ] 9. Build home page with search, trending, and categories
  - Implement SearchBar, ServerCard, TrendingSection, CategorySidebar.
  - Wire search to API.
  - _Requirements: 1, 2, 3, 11_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** Search returns results as user types. Category filters work. Trending shows top servers. Mobile works.

- [ ] 10. Build server detail page with config generator
  - Implement ServerProfile with rendered README, tool schemas, GitHub stats, maintenance warning.
  - Implement ConfigGenerator with clipboard copy.
  - Implement vote/favorite buttons and TagInput.
  - _Requirements: 4, 5, 8, 9_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** README renders. Tool schemas displayed. Config copies valid JSON. Vote/favorite toggles. Tags addable.

- [ ] 11. Build authentication flow and user profile
  - Implement AuthButton with GitHub OAuth.
  - Implement auth context and protected routes.
  - Implement UserProfile page.
  - _Requirements: 6, 8_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** GitHub OAuth works. Profile shows avatar/username. Favorites/submissions list. Unauthed users redirected.

- [ ] 12. Build server submission flow
  - Implement SubmitForm with URL input, validation, metadata preview, category selection.
  - Handle errors for invalid URLs and duplicates.
  - _Requirements: 7_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** Valid URL shows preview. Categories selectable. Duplicate shows error. Success redirects to profile.

- [ ] 13. Implement initial seeding script
  - Build SeederService for bulk import from official registry and GitHub.
  - Auto-categorize based on descriptions.
  - Run as CLI script (npm run seed).
  - _Requirements: 10_
  - _Skills: /code-writing-software-development, /postgres-patterns_
  - **AC:** 100+ servers imported. Each has metadata, README, category. No duplicates. search_vector populated.

- [ ] 14. Write tests and achieve coverage targets
  - Unit tests for all server services.
  - Integration tests for API routes.
  - Component tests for key UI components.
  - E2E tests for critical flows.
  - _Requirements: all_
  - _Skills: /tdd-workflow, /code-writing-software-development_
  - **AC:** 80%+ server coverage. 70%+ client coverage. All E2E paths pass. CI runs tests.

- [ ] 15. SEO, performance, and deployment
  - Add meta/OG tags per server page.
  - Configure Vercel and Render deployments.
  - Set up GitHub Actions CI.
  - Verify Lighthouse >= 90.
  - _Requirements: 4.4, 11_
  - _Skills: /build-website-web-app, /code-writing-software-development_
  - **AC:** Unique meta tags per page. Deployments succeed. CI runs on PR. Lighthouse >= 90.
