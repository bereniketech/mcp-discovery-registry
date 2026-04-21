---
task: 021
feature: mcp-discovery-registry
status: open
priority: P4
depends_on: [020]
---

# Task 021: P4 — Operations (Health Checks, Version Tracking, Install Instructions, Admin Moderation)

## Skills
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/frameworks-frontend/react-patterns/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`
- `.kit/agents/software-company/data/database-architect.md`
- `.kit/agents/software-company/qa/security-reviewer.md`

## Commands
- `.kit/commands/core/task-handoff.md`
- `.kit/commands/development/build-fix.md`
- `.kit/commands/testing-quality/tdd.md`

---

## Objective

Four operational features that make the registry trustworthy and manageable at scale:

1. **Server health/ping checks** — verify MCP servers are reachable and flag stale/dead ones.
2. **Version tracking** — record version history and expose changelog per server.
3. **Structured install instructions** — per-runtime installation commands (npm, pip, cargo, docker) stored and rendered.
4. **Admin moderation panel** — flag, review, and remove malicious or deprecated servers.

---

## Feature 1 — Server Health / Ping Checks

### What to Check

MCP servers are npm packages, pip packages, or Docker images — not HTTP endpoints. "Health" means:
- GitHub repo still exists (not 404/archived/private)
- Last commit within 180 days (not abandoned)
- `package.json` / `pyproject.toml` / `Cargo.toml` still present at root (not gutted)

### DB Changes

```sql
ALTER TABLE servers ADD COLUMN health_status  TEXT NOT NULL DEFAULT 'unknown'
  CHECK (health_status IN ('healthy', 'stale', 'dead', 'unknown'));
ALTER TABLE servers ADD COLUMN health_checked_at TIMESTAMPTZ;
ALTER TABLE servers ADD COLUMN health_reason    TEXT; -- human-readable reason for non-healthy
```

### Service (`server/src/services/health-checker.ts`)

```ts
class HealthCheckerService {
  async checkServer(serverId: string): Promise<HealthResult>
  async checkAll(): Promise<{ checked: number, updated: number }>
}

type HealthResult = {
  status: 'healthy' | 'stale' | 'dead'
  reason?: string
  checkedAt: Date
}
```

Logic:
- GitHub 404 or `archived: true` → `dead`
- Last commit > 180 days → `stale`
- No manifest file at root → `stale`
- Otherwise → `healthy`

### Scheduled Check

Integrate with the GitHub metadata refresh cron from task-018. Add health check pass to the same job (run daily, not every 6h — GitHub API budget).

### API Endpoint

```
GET /api/v1/servers/:slug  →  include health_status, health_checked_at, health_reason in response
```

No new endpoint needed — extend the existing detail response.

### Frontend

- `ServerDetail`: show a colored badge next to the server name: green (healthy), amber (stale), red (dead).
- Stale: "Last commit X days ago — may be inactive."
- Dead: "Repository not found or archived." Banner shown above README.
- `ServerCard`: show health badge as small colored dot.

---

## Feature 2 — Version Tracking

Track when a server's GitHub release tag or package version changes.

### DB Schema

New migration `0007_versions.sql`:

```sql
CREATE TABLE server_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  version     TEXT NOT NULL,               -- e.g. "1.2.3" or git tag
  release_url TEXT,                        -- GitHub release URL if available
  released_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changelog   TEXT                         -- release notes if available from GitHub
);

CREATE INDEX ON server_versions (server_id, released_at DESC);
ALTER TABLE servers ADD COLUMN latest_version TEXT;
```

### GitHubFetcherService extension

Add `fetchReleases(repoUrl: string): Promise<Release[]>` — calls `GET /repos/:owner/:repo/releases?per_page=10`. Maps to `{ version, url, publishedAt, body }`.

### Cron Integration

On each GitHub metadata refresh (task-018), also fetch releases. For each new release tag not in `server_versions`, insert a row and update `servers.latest_version`.

### API Endpoint

```
GET /api/v1/servers/:id/versions   →  { data: ServerVersion[], meta: { total } }
```

Create in `server/src/routes/versions.ts`. Public, paginated (10 per page, ordered by `released_at DESC`).

### Frontend

- In `ServerDetail`, add a "Versions" tab alongside the README.
- Renders a timeline: version tag, release date, changelog (collapsed by default, expandable).
- Latest version badge shown in the server header.

---

## Feature 3 — Structured Install Instructions

Replace the generic `npx -y <repo-path>` config with per-runtime, structured install commands.

### DB Schema (reuses task-018 `config_template` column)

The `config_template` column from task-018 stores a JSON object:

```ts
type InstallConfig = {
  npm?:    { install: string, run: string }          // e.g. { install: "npm i -g @scope/pkg", run: "npx @scope/pkg" }
  pip?:    { install: string, run: string }
  cargo?:  { install: string, run: string }
  docker?: { pull: string, run: string }
  manual?: string                                     // free-form fallback
}
```

Auto-populate from manifest files fetched during GitHub fetch:
- `package.json` present → populate `npm`
- `pyproject.toml` / `setup.py` present → populate `pip`
- `Cargo.toml` present → populate `cargo`
- `Dockerfile` present → populate `docker`

### Service: `InstallConfigService`

```ts
class InstallConfigService {
  async derive(repoMeta: GitHubRepoMeta, readme: string): Promise<InstallConfig>
}
```

Called from `ServerService.create()` and the GitHub refresh cron.

### ConfigGenerator Component (update)

Update `client/src/components/ConfigGenerator.tsx`:
- Show tabs: Claude Desktop | Cursor | npm | pip | cargo | Docker
- Each tab shows the appropriate install command from `config_template`.
- If a runtime tab has no data, hide it.
- Claude Desktop and Cursor tabs use MCP JSON format (existing behavior) but now use `config_template.npm.run` or equivalent instead of a guessed `npx` command.

---

## Feature 4 — Admin Moderation Panel

A protected admin interface for reviewing and actioning reported or automated flags.

### DB Schema

```sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),    -- NULL = automated flag
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE servers ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'active'
  CHECK (moderation_status IN ('active', 'flagged', 'removed'));
```

### API Endpoints

Create `server/src/routes/admin.ts`. Apply `requireAdmin` middleware (checks `users.is_admin = true`).

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/servers` | List all servers with `moderation_status != 'active'` plus any flagged. |
| POST | `/api/v1/admin/servers/:id/flag` | Set `moderation_status = 'flagged'`. |
| DELETE | `/api/v1/admin/servers/:id` | Set `moderation_status = 'removed'` (soft delete — hidden from all public endpoints). |
| POST | `/api/v1/admin/reports/:id/dismiss` | Set report `status = 'dismissed'`. |
| POST | `/api/v1/servers/:id/report` | Any auth user submits a report. Body: `{ reason }`. Rate-limited: 3 per user per server per day. |

**All public listing queries** (`GET /api/v1/servers`, `/trending`, `/categories`) must add `WHERE moderation_status = 'active'` filter.

### Frontend — Report Button

- Add "Report" button to `ServerDetail` (authenticated only).
- Opens a modal: radio buttons for reason (Malicious, Abandoned, Duplicate, Other) + optional text.
- Submits to `POST /api/v1/servers/:id/report`.

### Frontend — Admin Panel

Route: `/admin` (hidden from nav, direct URL only).
Protected: redirect to `/` if `users.is_admin = false`.

Renders a simple table:
- Columns: Server name | Status | Reports count | Actions (Flag | Remove | Dismiss)
- Filter tabs: All flagged | Reported | Removed

No separate admin UI framework — plain TailwindCSS table.

---

## Acceptance Criteria

- [ ] `health_status` badge shown on `ServerCard` and `ServerDetail` (green/amber/red)
- [ ] Health check cron runs daily and updates all servers
- [ ] Dead/archived repos show "Repository not found" banner in `ServerDetail`
- [ ] `GET /api/v1/servers/:id/versions` returns paginated release history
- [ ] "Versions" tab in `ServerDetail` renders changelog timeline
- [ ] `servers.latest_version` updated on each cron refresh
- [ ] `ConfigGenerator` shows per-runtime tabs (npm/pip/cargo/docker) based on `config_template`
- [ ] `POST /api/v1/servers/:id/report` stores report; 429 after 3 reports per user per server per day
- [ ] Admin `DELETE /api/v1/admin/servers/:id` soft-removes server; removed servers absent from all public lists
- [ ] `/admin` route inaccessible to non-admin users (403 from API + client redirect)
- [ ] `npm run build` and `npm test` pass

---

## Handoff
Run `/task-handoff`. Begin task-022 next.
