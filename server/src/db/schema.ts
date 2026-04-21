import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  integer,
  smallint,
  numeric,
  customType,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { ToolSchema, ConfigTemplate } from '../types/server-metadata.js';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ─── Users ────────────────────────────────────────────────────────────────────
// id mirrors auth.users.id in Supabase — no auto-generation here.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  // Internal field for future notifications — not exposed in public API responses.
  email: text('email'),
  // Grants access to the admin moderation panel.
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  // Controls the ordering of categories in navigation. Lower values appear first.
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Servers ──────────────────────────────────────────────────────────────────
export const servers = pgTable('servers', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  githubUrl: text('github_url').notNull().unique(),
  websiteUrl: text('website_url'),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  votesCount: integer('votes_count').notNull().default(0),
  favoritesCount: integer('favorites_count').notNull().default(0),
  readmeContent: text('readme_content'),
  githubStars: integer('github_stars').notNull().default(0),
  githubForks: integer('github_forks').notNull().default(0),
  openIssues: integer('open_issues').notNull().default(0),
  lastCommitAt: timestamp('last_commit_at', { withTimezone: true }),
  // JSON schemas for the tools this MCP server exposes.
  toolSchemas: jsonb('tool_schemas').$type<ToolSchema[]>().default([]),
  // Template for generating a client configuration snippet.
  configTemplate: jsonb('config_template').$type<ConfigTemplate | null>(),
  searchVector: tsvector('search_vector'),
  // Computed rating fields — updated by RatingService on each upsert/remove.
  ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }),
  ratingCount: integer('rating_count').notNull().default(0),
  // Comments count — updated by CommentService on each insert/delete.
  commentsCount: integer('comments_count').notNull().default(0),
  // Ownership claim fields — set when the GitHub repo owner verifies ownership.
  ownerId: uuid('owner_id').references(() => users.id),
  claimToken: text('claim_token'),
  claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
  // Health check fields — updated by the daily health-checker cron.
  healthStatus: text('health_status').notNull().default('unknown'),
  healthCheckedAt: timestamp('health_checked_at', { withTimezone: true }),
  healthReason: text('health_reason'),
  // Latest release version from GitHub releases.
  latestVersion: text('latest_version'),
  // Moderation status — set by admin actions.
  moderationStatus: text('moderation_status').notNull().default('active'),
  // MCP protocol spec versions this server is compatible with (e.g. ['2024-11-05']).
  mcpSpecVersions: text('mcp_spec_versions').array().notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Server Categories (junction) ─────────────────────────────────────────────
export const serverCategories = pgTable(
  'server_categories',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    uqServerCategories: unique('uq_server_categories').on(t.serverId, t.categoryId),
  }),
);

// ─── Votes ────────────────────────────────────────────────────────────────────
export const votes = pgTable(
  'votes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqVotesUserServer: unique('uq_votes_user_server').on(t.userId, t.serverId),
  }),
);

// ─── Favorites ────────────────────────────────────────────────────────────────
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqFavoritesUserServer: unique('uq_favorites_user_server').on(t.userId, t.serverId),
  }),
);

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tags = pgTable('tags', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Server Tags (junction) ───────────────────────────────────────────────────
export const serverTags = pgTable(
  'server_tags',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    uqServerTags: unique('uq_server_tags').on(t.serverId, t.tagId),
  }),
);

// ─── Comments ─────────────────────────────────────────────────────────────────
export const comments = pgTable('comments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  serverId: uuid('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // NULL means top-level comment; non-null means a reply.
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
    onDelete: 'cascade',
  }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Ratings ──────────────────────────────────────────────────────────────────
export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 1–5 star rating
    score: smallint('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqRatingsUserServer: unique('uq_ratings_user_server').on(t.userId, t.serverId),
  }),
);

// ─── Server Versions ──────────────────────────────────────────────────────────
export const serverVersions = pgTable('server_versions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  serverId: uuid('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  releaseUrl: text('release_url'),
  releasedAt: timestamp('released_at', { withTimezone: true }).notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  changelog: text('changelog'),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports = pgTable('reports', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  serverId: uuid('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id').references(() => users.id),
  reason: text('reason').notNull(),
  // 'open' | 'dismissed' | 'actioned'
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────
export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    url: text('url').notNull(),
    // 'discord' | 'slack' | 'generic'
    type: text('type').notNull(),
    events: text('events').array().notNull().default(sql`'{server.created}'`),
    secret: text('secret'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    typeCheck: check('webhooks_type_check', sql`${t.type} IN ('discord', 'slack', 'generic')`),
  }),
);
