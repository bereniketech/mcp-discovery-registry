# Requirements: MCP Discovery Registry

## Introduction
The Universal MCP Discovery Registry is a community-driven web platform that enables developers to discover, evaluate, and integrate MCP (Model Context Protocol) servers. It addresses ecosystem fragmentation by aggregating servers from GitHub, npm, and individual registries into a single searchable, categorized, and trust-signaled platform.

## Requirements

### Requirement 1: Semantic Search

**User Story:** As a developer, I want to search for MCP servers using natural language queries, so that I can quickly find servers matching my use case without knowing exact names.

#### Acceptance Criteria
1. WHEN a user enters a search query THEN the system SHALL return results ranked by relevance across server name, description, tool schemas, and README content.
2. WHEN a user enters a query with no results THEN the system SHALL display a "no results" message with suggested categories.
3. The system SHALL return search results within 500ms for p95 queries.

### Requirement 2: Category Navigation

**User Story:** As a developer, I want to browse MCP servers by category (Databases, Productivity, DevTools, etc.), so that I can explore available servers without a specific query.

#### Acceptance Criteria
1. WHEN a user selects a category THEN the system SHALL display all servers in that category, sorted by popularity.
2. The system SHALL support at least these categories: Databases, Productivity, Social Media, Developer Tools, AI Infrastructure, Data Processing, Communication.
3. WHEN a server belongs to multiple categories THEN the system SHALL display it in each relevant category.

### Requirement 3: Trending & Popularity Ranking

**User Story:** As a developer, I want to see trending and popular MCP servers, so that I can discover high-quality, actively maintained servers.

#### Acceptance Criteria
1. The system SHALL rank servers using a composite score of upvotes, GitHub stars, and recent activity.
2. WHEN calculating trending scores THEN the system SHALL apply time-decay weighting so that recent activity ranks higher than historical metrics.
3. WHEN a user visits the home page THEN the system SHALL display a "Trending" section with the top 10 trending servers.

### Requirement 4: Rich Server Profiles

**User Story:** As a developer, I want to view detailed server profiles with documentation, tool schemas, and health signals, so that I can evaluate server quality before integrating.

#### Acceptance Criteria
1. WHEN a user opens a server profile THEN the system SHALL display: rendered README, list of available tools with input/output schemas, GitHub stats (stars, forks, last commit, open issues).
2. WHEN a server's GitHub repo has not been updated in >90 days THEN the system SHALL display a "potentially unmaintained" warning.
3. WHEN README content contains Markdown THEN the system SHALL render it with syntax highlighting for code blocks.
4. Each server profile page SHALL have a unique, SEO-friendly URL (`/servers/{slug}`).

### Requirement 5: One-Click Configuration

**User Story:** As a developer, I want to copy a ready-to-use mcpServers JSON config for any server, so that I can integrate it into Claude Desktop or Cursor immediately.

#### Acceptance Criteria
1. WHEN a user clicks "Copy Config" on a server profile THEN the system SHALL copy valid mcpServers JSON to the clipboard.
2. The system SHALL support config generation for at least: Claude Desktop, Cursor.
3. IF a server requires environment variables THEN the system SHALL include placeholder values with comments in the generated config.

### Requirement 6: User Authentication

**User Story:** As a developer, I want to sign in with my GitHub account, so that I can submit servers, upvote, and manage favorites.

#### Acceptance Criteria
1. WHEN a user clicks "Sign In" THEN the system SHALL initiate GitHub OAuth flow via Supabase Auth.
2. WHEN a user completes OAuth THEN the system SHALL create or update their profile with GitHub username, avatar, and email.
3. IF an unauthenticated user tries to upvote, favorite, or submit THEN the system SHALL redirect them to sign in first.

### Requirement 7: Server Submissions

**User Story:** As a developer, I want to submit an MCP server by providing its GitHub URL, so that it can be listed in the registry.

#### Acceptance Criteria
1. WHEN a user submits a valid GitHub URL THEN the system SHALL automatically fetch: repo name, description, stars, README, last commit date.
2. WHEN a user submits a URL that already exists in the registry THEN the system SHALL display an error: "This server is already registered."
3. WHEN a submission is successful THEN the server SHALL appear in search results within 5 minutes.
4. IF the GitHub URL is invalid or inaccessible THEN the system SHALL display a clear error message.

### Requirement 8: Upvoting & Favorites

**User Story:** As an authenticated developer, I want to upvote and favorite MCP servers, so that I can signal quality and bookmark servers for later.

#### Acceptance Criteria
1. WHEN an authenticated user clicks upvote THEN the system SHALL increment the server's vote count by 1 and record the user's vote.
2. WHEN a user who already upvoted clicks upvote again THEN the system SHALL remove their vote (toggle behavior).
3. WHEN a user favorites a server THEN the system SHALL add it to their favorites list, accessible from their profile.
4. The system SHALL prevent duplicate votes (one vote per user per server).

### Requirement 9: Community Tagging

**User Story:** As an authenticated developer, I want to add tags to servers (e.g., #read-only, #no-auth-required), so that others can filter and discover servers by attributes.

#### Acceptance Criteria
1. WHEN a user adds a tag THEN the system SHALL associate it with the server and make it searchable.
2. The system SHALL enforce lowercase, hyphenated tag format (e.g., `read-only`, `no-auth`).
3. WHEN searching or filtering THEN the system SHALL support filtering by one or more tags.
4. IF a tag already exists on a server THEN the system SHALL not create a duplicate.

### Requirement 10: Initial Seeding

**User Story:** As a first-time visitor, I want to see a registry pre-populated with popular MCP servers, so that the platform is useful from day one.

#### Acceptance Criteria
1. The system SHALL be seeded with at least 100 MCP servers sourced from the official registry and GitHub.
2. WHEN seeded servers are imported THEN the system SHALL fetch and store their README, tool schemas, and GitHub metadata.
3. The system SHALL assign initial categories to seeded servers based on their descriptions and tool types.

### Requirement 11: Responsive UI

**User Story:** As a developer, I want the registry to work well on both desktop and mobile, so that I can browse servers from any device.

#### Acceptance Criteria
1. The system SHALL be fully functional on viewports from 375px (mobile) to 1920px+ (desktop).
2. WHEN viewed on mobile THEN the system SHALL use a responsive layout with collapsible navigation and stacked cards.
3. The system SHALL achieve a Lighthouse performance score >= 90 on desktop.
