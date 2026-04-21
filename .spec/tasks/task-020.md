---
task: 020
feature: mcp-discovery-registry
status: open
priority: P4
depends_on: [019]
---

# Task 020: P4 — User Engagement (Comments, Ratings, Server Ownership Claim)

## Skills
- `.kit/skills/frameworks-backend/nodejs-best-practices/SKILL.md`
- `.kit/skills/frameworks-frontend/react-patterns/SKILL.md`
- `.kit/skills/data-backend/postgres-patterns/SKILL.md`
- `.kit/skills/testing-quality/tdd-workflow/SKILL.md`
- `.kit/skills/core/karpathy-principles/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`
- `.kit/agents/software-company/engineering/web-frontend-expert.md`
- `.kit/agents/software-company/data/database-architect.md`
- `.kit/agents/software-company/qa/test-expert.md`

## Commands
- `.kit/commands/core/task-handoff.md`
- `.kit/commands/development/build-fix.md`
- `.kit/commands/testing-quality/tdd.md`

---

## Objective

Three engagement features that turn the registry from a passive directory into an active community:

1. **Per-server comments/discussions** — authenticated users post threaded comments on any server listing.
2. **1–5 star ratings** — richer sentiment signal beyond binary vote.
3. **Server ownership claim** — GitHub repo owners verify ownership and gain edit rights over their listing.

---

## Feature 1 — Comments / Discussions

### DB Schema

New migration `0005_comments.sql`:

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE, -- NULL = top-level
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON comments (server_id, created_at DESC);
CREATE INDEX ON comments (parent_id) WHERE parent_id IS NOT NULL;

-- RLS: anyone can read, authenticated users can insert, only author can update/delete
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all"   ON comments FOR SELECT USING (true);
CREATE POLICY "insert_own" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own" ON comments FOR DELETE USING (auth.uid() = user_id);
```

Add `comments_count` integer to `servers` table (updated by trigger or application code on insert/delete).

### Drizzle Schema additions (`server/src/db/schema.ts`)

```ts
export const comments = pgTable('comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  serverId:  uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId:  uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  body:      text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

### API Endpoints

Create `server/src/routes/comments.ts`:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/servers/:id/comments` | public | List top-level comments + first level of replies. `?page=1&per_page=20`. |
| POST | `/api/v1/servers/:id/comments` | required | Create comment. Body: `{ body, parent_id? }`. |
| PATCH | `/api/v1/comments/:id` | required (author only) | Edit body. |
| DELETE | `/api/v1/comments/:id` | required (author only) | Soft-delete (set body to `[deleted]`, keep row for thread integrity). |

### Service (`server/src/services/comment.ts`)

```ts
class CommentService {
  async list(serverId: string, page: number, perPage: number): Promise<PaginatedResponse<Comment>>
  async create(serverId: string, userId: string, body: string, parentId?: string): Promise<Comment>
  async update(commentId: string, userId: string, body: string): Promise<Comment>  // 403 if not author
  async delete(commentId: string, userId: string): Promise<void>                   // soft-delete
}
```

### Frontend

- Add `CommentThread` component to `ServerDetail` page below the README.
- Load comments on mount, refresh after post.
- Textarea + submit button for authenticated users; sign-in prompt for anonymous.
- Reply button on each comment opens inline reply textarea.
- No nested replies beyond one level (flat threading).

---

## Feature 2 — Star Ratings (1–5)

### DB Schema

New migration `0006_ratings.sql`:

```sql
CREATE TABLE ratings (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score     SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);

ALTER TABLE servers ADD COLUMN rating_avg  NUMERIC(3,2) DEFAULT NULL;
ALTER TABLE servers ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
```

`rating_avg` and `rating_count` updated via application code in `RatingService.upsert()`.

### API Endpoints

Add to `server/src/routes/server-actions.ts`:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/servers/:id/rate` | required | `{ score: 1–5 }` — upsert (replace existing rating). Returns updated `{ rating_avg, rating_count }`. |
| DELETE | `/api/v1/servers/:id/rate` | required | Remove own rating. |

Apply `writeLimiter` to both routes (carried forward from task-017).

### Service

```ts
class RatingService {
  async upsert(serverId: string, userId: string, score: number): Promise<{ avg: number, count: number }>
  async remove(serverId: string, userId: string): Promise<{ avg: number, count: number }>
}
```

Both methods recompute `rating_avg` and `rating_count` in a transaction and write back to `servers`.

### Frontend

- Add `StarRating` component in `ServerDetail` — 5 clickable stars.
- Authenticated: clicking a star calls `POST /rate`. Clicking current score again calls `DELETE /rate`.
- Display `rating_avg` (1 decimal) and `rating_count` next to the vote counter.
- Optimistic UI: update stars immediately, revert on API error.

---

## Feature 3 — Server Ownership Claim

Allows the GitHub repo owner to claim their listing, unlocking edit rights (name, description, categories).

### Flow

1. User navigates to a server detail page and clicks "Claim this server".
2. API issues a short-lived verification token and instructs user to add it to their repo (GitHub topic `mcp-claim-<token>` or a file `mcp-claim.txt` at repo root).
3. User clicks "Verify" — API fetches the repo via GitHub and checks for the token.
4. On success: `servers.owner_id` set to `user_id`; user gets edit access.

### DB Changes

```sql
ALTER TABLE servers ADD COLUMN owner_id         UUID REFERENCES users(id);
ALTER TABLE servers ADD COLUMN claim_token      TEXT;
ALTER TABLE servers ADD COLUMN claim_expires_at TIMESTAMPTZ;
```

### API Endpoints

Create `server/src/routes/ownership.ts`:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/servers/:id/claim/init` | required | Generate `claim_token`, store with 24h expiry. Return `{ token, instructions }`. |
| POST | `/api/v1/servers/:id/claim/verify` | required | Call GitHub API, check for token in topics or `mcp-claim.txt`. On success set `owner_id`. |
| PATCH | `/api/v1/servers/:id` | required (owner only) | Edit `name`, `description`, `categories`. 403 if not `owner_id`. |

### Service

```ts
class OwnershipService {
  async initClaim(serverId: string, userId: string): Promise<{ token: string, instructions: string }>
  async verifyClaim(serverId: string, userId: string): Promise<{ claimed: boolean }>
  async updateListing(serverId: string, userId: string, patch: ServerPatch): Promise<Server>
}
```

### Frontend

- "Claim this server" button visible on `ServerDetail` for authenticated non-owners.
- Clicking opens a modal with step-by-step instructions and a "Verify" button.
- On successful claim: button replaced with "You own this — Edit listing".
- Edit listing opens an inline form for name, description, category selection.

---

## Acceptance Criteria

- [x] `GET /api/v1/servers/:id/comments` returns paginated comment list with author info
- [x] Authenticated user can post, edit, delete their own comment; 403 on others
- [x] Soft-delete replaces body with `[deleted]`, keeps row
- [x] `POST /api/v1/servers/:id/rate` with score 1–5 upserts rating; `rating_avg` and `rating_count` updated
- [x] `StarRating` component renders correct filled stars for current user's rating
- [x] Claim init returns token with instructions; claim verify succeeds when token found in GitHub
- [x] Owner can PATCH server name/description/categories; non-owner gets 403
- [x] `npm run build` and `npm test` pass
- [x] No regressions in existing vote/favorite/tag flows

Status: COMPLETE

---

## Handoff
Run `/task-handoff` after all three features pass acceptance criteria. Begin task-021 next.
