import { sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';

export type SortOption = 'trending' | 'newest' | 'stars' | 'votes';

export interface SearchParams {
  q?: string;
  category?: string;
  tags?: string[];
  sort?: SortOption;
  page?: number;
  perPage?: number;
  mcpVersion?: string;
}

export interface SearchPageResult<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ServerSearchItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  githubUrl: string;
  websiteUrl: string | null;
  authorId: string;
  votesCount: number;
  favoritesCount: number;
  readmeContent: string | null;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt: Date | null;
  searchVector: string | null;
  createdAt: Date;
  updatedAt: Date;
  categories: string[];
  tags: string[];
}

interface RawServerRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string;
  github_url: string;
  website_url: string | null;
  author_id: string;
  votes_count: number | string;
  favorites_count: number | string;
  readme_content: string | null;
  github_stars: number | string;
  github_forks: number | string;
  open_issues: number | string;
  last_commit_at: Date | string | null;
  search_vector: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  categories: string[] | null;
  tags: string[] | null;
}

interface RawCountRow extends Record<string, unknown> {
  total: number | string;
}

// Half-life for recency scoring: 30 days in seconds
const RECENCY_HALF_LIFE_SECS = 30 * 86_400;

type DbClient = typeof db;

/**
 * Converts a free-text query string into a PostgreSQL tsquery AND-expression.
 * Returns null if the query is empty after sanitization.
 */
export function buildTsQueryString(q: string): string | null {
  const terms = q
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean);

  return terms.length > 0 ? terms.join(' & ') : null;
}

/**
 * Computes the composite trending score for in-memory use / testing.
 * Formula: ts_rank * 10 + votes * 2 + stars + recency_bonus * 5
 */
export function computeCompositeScore(
  tsRank: number,
  votesCount: number,
  githubStars: number,
  createdAt: Date,
): number {
  const ageSecs = (Date.now() - createdAt.getTime()) / 1_000;
  const recencyBonus = Math.exp(-ageSecs / RECENCY_HALF_LIFE_SECS);
  return tsRank * 10 + votesCount * 2 + githubStars + recencyBonus * 5;
}

function mapRow(row: RawServerRow): ServerSearchItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    githubUrl: row.github_url,
    websiteUrl: row.website_url,
    authorId: row.author_id,
    votesCount: Number(row.votes_count),
    favoritesCount: Number(row.favorites_count),
    readmeContent: row.readme_content,
    githubStars: Number(row.github_stars),
    githubForks: Number(row.github_forks),
    openIssues: Number(row.open_issues),
    lastCommitAt:
      row.last_commit_at instanceof Date
        ? row.last_commit_at
        : row.last_commit_at
          ? new Date(row.last_commit_at)
          : null,
    searchVector: row.search_vector,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    categories: row.categories ?? [],
    tags: row.tags ?? [],
  };
}

export class SearchService {
  constructor(private readonly database: DbClient = db) {}

  async search(params: SearchParams): Promise<SearchPageResult<ServerSearchItem>> {
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
    const offset = (page - 1) * perPage;
    const sort: SortOption = params.sort ?? 'trending';
    const tsQueryStr = params.q?.trim() ? buildTsQueryString(params.q) : null;

    // Build WHERE conditions
    // Always exclude flagged/removed servers from public listings.
    const whereParts: SQL[] = [sql`s.moderation_status = 'active'`];

    if (tsQueryStr) {
      whereParts.push(sql`s.search_vector @@ to_tsquery('english', ${tsQueryStr})`);
    }

    if (params.category) {
      whereParts.push(sql`EXISTS (
        SELECT 1 FROM server_categories sc2
        INNER JOIN categories c2 ON c2.id = sc2.category_id
        WHERE sc2.server_id = s.id AND c2.slug = ${params.category}
      )`);
    }

    if (params.tags && params.tags.length > 0) {
      for (const tag of params.tags) {
        whereParts.push(sql`EXISTS (
          SELECT 1 FROM server_tags st2
          INNER JOIN tags t2 ON t2.id = st2.tag_id
          WHERE st2.server_id = s.id AND t2.slug = ${tag}
        )`);
      }
    }

    if (params.mcpVersion) {
      whereParts.push(sql`${params.mcpVersion} = ANY(s.mcp_spec_versions)`);
    }

    const whereClause: SQL =
      whereParts.length > 0
        ? sql`WHERE ${sql.join(whereParts, sql` AND `)}`
        : sql``;

    // Build ORDER BY
    let orderClause: SQL;

    if (sort === 'newest') {
      orderClause = sql`ORDER BY s.created_at DESC`;
    } else if (sort === 'stars') {
      orderClause = sql`ORDER BY s.github_stars DESC, s.created_at DESC`;
    } else if (sort === 'votes') {
      orderClause = sql`ORDER BY s.votes_count DESC, s.created_at DESC`;
    } else if (tsQueryStr) {
      // trending: composite score weighted by ts_rank
      orderClause = sql`ORDER BY (
        ts_rank(s.search_vector, to_tsquery('english', ${tsQueryStr})) * 10.0
        + s.votes_count * 2.0
        + s.github_stars * 1.0
        + EXP(EXTRACT(EPOCH FROM (NOW() - s.created_at)) / ${-RECENCY_HALF_LIFE_SECS}) * 5.0
      ) DESC NULLS LAST, s.created_at DESC`;
    } else {
      // trending without text query
      orderClause = sql`ORDER BY (
        s.votes_count * 2.0
        + s.github_stars * 1.0
        + EXP(EXTRACT(EPOCH FROM (NOW() - s.created_at)) / ${-RECENCY_HALF_LIFE_SECS}) * 5.0
      ) DESC NULLS LAST, s.created_at DESC`;
    }

    const [countResult, rowResult] = await Promise.all([
      this.database.execute<RawCountRow>(sql`
        SELECT COUNT(DISTINCT s.id)::int AS total
        FROM servers s
        ${whereClause}
      `),
      this.database.execute<RawServerRow>(sql`
        SELECT
          s.id,
          s.name,
          s.slug,
          s.description,
          s.github_url,
          s.website_url,
          s.author_id,
          s.votes_count,
          s.favorites_count,
          s.readme_content,
          s.github_stars,
          s.github_forks,
          s.open_issues,
          s.last_commit_at,
          s.search_vector,
          s.created_at,
          s.updated_at,
          COALESCE(
            ARRAY_AGG(DISTINCT c.slug) FILTER (WHERE c.slug IS NOT NULL),
            ARRAY[]::text[]
          ) AS categories,
          COALESCE(
            ARRAY_AGG(DISTINCT t.slug) FILTER (WHERE t.slug IS NOT NULL),
            ARRAY[]::text[]
          ) AS tags
        FROM servers s
        LEFT JOIN server_categories sc ON sc.server_id = s.id
        LEFT JOIN categories c ON c.id = sc.category_id
        LEFT JOIN server_tags st ON st.server_id = s.id
        LEFT JOIN tags t ON t.id = st.tag_id
        ${whereClause}
        GROUP BY
          s.id, s.name, s.slug, s.description, s.github_url, s.website_url,
          s.author_id, s.votes_count, s.favorites_count, s.readme_content,
          s.github_stars, s.github_forks, s.open_issues, s.last_commit_at,
          s.search_vector, s.created_at, s.updated_at
        ${orderClause}
        LIMIT ${perPage} OFFSET ${offset}
      `),
    ]);

    const total = Number((countResult as RawCountRow[])[0]?.total ?? 0);
    const items = (rowResult as RawServerRow[]).map(mapRow);

    return {
      items,
      page,
      perPage,
      totalItems: total,
      totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
    };
  }
}
