import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
  searchVector: tsvector('search_vector'),
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
    value: integer('value').notNull(),
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
