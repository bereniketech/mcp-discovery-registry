---
task: 022
feature: mcp-discovery-registry
status: open
priority: P4
depends_on: [021]
---

# Task 022: P4 — Distribution (Webhooks, RSS Feed, MCP Spec Version, Tool Schema Discovery)

## Skills
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/frameworks-frontend/react-patterns/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`
- `.kit/agents/software-company/data/database-architect.md`

## Commands
- `.kit/commands/core/task-handoff.md`
- `.kit/commands/core/wrapup.md`
- `.kit/commands/development/build-fix.md`

---

## Objective

Four distribution and discoverability features that push registry data to external systems and enrich the quality of each server listing:

1. **Webhooks for new submissions** — notify Discord/Slack when a new server is approved.
2. **RSS/Atom feed** — subscribe to new server additions by category.
3. **MCP spec version compatibility field** — tag which MCP protocol version each server targets.
4. **Tool schema discovery** — auto-parse and store structured tool schemas from server metadata.

---

## Feature 1 — Webhooks for New Submissions

Notify external services (Discord, Slack, generic HTTP) when a server is submitted and passes validation.

### DB Schema

```sql
CREATE TABLE webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('discord', 'slack', 'generic')),
  events      TEXT[] NOT NULL DEFAULT '{server.created}',   -- future: server.removed, server.flagged
  secret      TEXT,           -- HMAC secret for generic webhooks
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Webhooks are admin-managed only (no self-service UI for this phase).

### Service (`server/src/services/webhook.ts`)

```ts
class WebhookService {
  async dispatch(event: 'server.created', payload: Server): Promise<void>
}
```

`dispatch` logic:
1. Load all active webhooks subscribed to the event.
2. For each:
   - `discord`: POST a Discord embed to `webhook.url` with server name, description, GitHub URL, category, submitter.
   - `slack`: POST a Slack Block Kit message.
   - `generic`: POST JSON `{ event, data, timestamp }` with `X-Webhook-Signature: HMAC-SHA256(secret, body)` header.
3. Fire-and-forget with exponential backoff (3 retries, 1s/2s/4s). Log failures, do not block the submit response.
4. Never expose `secret` in any API response.

### Integration Point

Call `WebhookService.dispatch('server.created', server)` at the end of `ServerService.create()`, after the server row is committed.

### Admin Webhook Management

Extend the `/admin` panel (from task-021) with a "Webhooks" tab:
- List active webhooks (id, name, type, events).
- "Add webhook" form: name, type, URL, secret (write-only — shown once on creation).
- Toggle active/inactive. Delete.

API endpoints in `server/src/routes/admin.ts` (admin-only):

| Method | Path |
|---|---|
| GET | `/api/v1/admin/webhooks` |
| POST | `/api/v1/admin/webhooks` |
| PATCH | `/api/v1/admin/webhooks/:id` |
| DELETE | `/api/v1/admin/webhooks/:id` |

---

## Feature 2 — RSS / Atom Feed

Subscribable feeds so users can track new servers in their RSS reader or automation tools.

### Endpoints

Create `server/src/routes/feeds.ts`:

| Path | Content | Description |
|---|---|---|
| `GET /feeds/rss.xml` | RSS 2.0 | All new servers, last 50, ordered by `created_at DESC` |
| `GET /feeds/rss.xml?category=<slug>` | RSS 2.0 | Servers in a specific category |
| `GET /feeds/atom.xml` | Atom 1.0 | Same as RSS but Atom format |

### Response Format

Respond with `Content-Type: application/rss+xml; charset=utf-8`.

Use the `feed` npm package (`npm install feed`) — it handles both RSS and Atom output:

```ts
import { Feed } from 'feed'

const feed = new Feed({
  title: 'MCP Discovery Registry — New Servers',
  description: 'Latest MCP servers added to the registry',
  id: process.env.BASE_URL,
  link: process.env.BASE_URL,
  updated: servers[0]?.createdAt ?? new Date(),
})

servers.forEach(s => feed.addItem({
  title: s.name,
  id: `${process.env.BASE_URL}/servers/${s.slug}`,
  link: `${process.env.BASE_URL}/servers/${s.slug}`,
  description: s.description,
  date: s.createdAt,
  category: s.categories.map(c => ({ name: c.name })),
}))

res.set('Content-Type', 'application/rss+xml')
res.send(feed.rss2())
```

Cache feed responses for 300s (same middleware from task-019).

### Frontend Discovery

Add `<link>` tags to `client/index.html`:

```html
<link rel="alternate" type="application/rss+xml" title="MCP Registry RSS" href="/feeds/rss.xml" />
<link rel="alternate" type="application/atom+xml" title="MCP Registry Atom" href="/feeds/atom.xml" />
```

Add a small RSS icon link in `Header.tsx` pointing to `/feeds/rss.xml`.

---

## Feature 3 — MCP Spec Version Compatibility

Tag each server with which MCP protocol version(s) it targets so users can filter by compatibility.

### DB Schema

```sql
ALTER TABLE servers ADD COLUMN mcp_spec_versions TEXT[] DEFAULT '{}';
-- e.g. '{2024-11-05, 2025-03-26}' — official MCP spec release dates used as version identifiers
```

Known MCP spec versions (seed into a lookup table or hardcode as constants):
```ts
export const MCP_SPEC_VERSIONS = [
  '2024-11-05',  // initial release
  '2025-03-26',  // draft-07 additions
] as const
```

### Auto-Detection

During GitHub fetch, scan `README.md` and `package.json` for version strings matching known MCP spec date patterns. Update `mcp_spec_versions` array. Fallback: leave empty (user or owner can set manually).

### API Changes

- `GET /api/v1/servers` — accept `?mcp_version=2025-03-26` filter; add to search query.
- `GET /api/v1/servers/:slug` — include `mcp_spec_versions` in response.
- `PATCH /api/v1/servers/:id` (owner-only, from task-020) — allow updating `mcp_spec_versions`.

### Frontend

- `SearchBar`: add a "MCP Version" dropdown filter with known versions.
- `ServerCard`: show version badge if `mcp_spec_versions` is non-empty.
- `ServerDetail`: show compatibility matrix — which spec versions this server supports.
- Submit form: optional "MCP Spec Version" multi-select.

---

## Feature 4 — Tool Schema Discovery

Auto-parse and persistently store the structured tool schemas exposed by each MCP server so users can inspect them without installing the server.

### Context

MCP servers expose a `tools/list` response — a JSON array of tool definitions, each with `name`, `description`, `inputSchema` (JSON Schema). Many servers document this in their README as a JSON code block. Task-018 added the `tool_schemas` column — this task populates it.

### Discovery Strategy

**Source 1 — README parsing (already partially done in client):**

Move the heuristic parsing from the client (`ServerDetail.tsx`) to the server and persist the result. Parser:

```ts
function extractToolSchemasFromReadme(readme: string): ToolSchema[] {
  // Find ```json code blocks containing an array of objects with "name" and "inputSchema" keys
  const jsonBlocks = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)]
  for (const [, content] of jsonBlocks) {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.every(t => t.name && t.inputSchema)) {
        return parsed
      }
    } catch { continue }
  }
  return []
}
```

Call during `ServerService.create()` and GitHub metadata refresh. Store result in `servers.tool_schemas`.

**Source 2 — `mcp.json` manifest (emerging convention):**

Check for `mcp.json` at repo root during GitHub fetch. If present, parse and prefer over README extraction.

```ts
async function fetchMcpManifest(repoUrl: string): Promise<ToolSchema[] | null> {
  // GET https://raw.githubusercontent.com/:owner/:repo/HEAD/mcp.json
  // Parse and validate against ToolSchema array shape
}
```

### Drizzle Schema

`tool_schemas` column added in task-018. Type: `jsonb`. Store as `ToolSchema[]`:

```ts
export type ToolSchema = {
  name: string
  description?: string
  inputSchema: Record<string, unknown>  // JSON Schema
}
```

### API Response

`GET /api/v1/servers/:slug` already returns all server columns — `tool_schemas` is included automatically once populated. No new endpoint needed.

### Frontend Update

Update `ServerDetail.tsx`:
- Remove client-side README parsing heuristic (now done server-side).
- Read `tool_schemas` from the server response directly.
- Render tool list: name (bold), description, collapsible `inputSchema` JSON viewer.
- If `tool_schemas` is empty, show "No tool schemas detected — the server may not document its tools."

---

## Acceptance Criteria

- [x] `WebhookService.dispatch('server.created', server)` fires after every successful submission
- [x] Discord webhook receives embed with server name, description, GitHub URL
- [x] Generic webhook receives `X-Webhook-Signature` header and correct JSON payload
- [x] `GET /feeds/rss.xml` returns valid RSS 2.0 with last 50 servers
- [x] `GET /feeds/rss.xml?category=<slug>` filters to that category
- [x] `GET /feeds/atom.xml` returns valid Atom 1.0
- [x] Feed responses served with correct `Content-Type` header and cached 300s
- [x] `<link rel="alternate">` tags present in `index.html`
- [x] `GET /api/v1/servers?mcp_version=2025-03-26` filters correctly
- [x] `servers.mcp_spec_versions` populated for servers whose README/package.json references a known spec version
- [x] `servers.tool_schemas` populated from README JSON blocks or `mcp.json` during create and cron refresh
- [x] `ServerDetail` renders tool list from `tool_schemas` (no client-side parsing)
- [x] `npm run build` and `npm test` pass

Status: COMPLETE

---

## Completion — Full P4 Series Done

After task-022 completes, the P4 feature set is complete. Run:
1. `/task-handoff` — record changes
2. `/wrapup` — generate full P4 summary (tasks 020–022)
3. Update `bug-log.md` with any issues encountered across the P4 series
