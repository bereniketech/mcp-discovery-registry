import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

const DECAY_WINDOW_DAYS = 30;
const RECENCY_WEIGHT = 3;

interface RawTrendingRow extends Record<string, unknown> {
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
  trending_score: number | string;
}

type DbClient = typeof db;

export interface TrendingServerItem {
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
  trendingScore: number;
}

export function computeRecencyBonus(
  lastCommitAt: Date | null,
  now: Date = new Date(),
): number {
  if (!lastCommitAt) {
    return 0;
  }

  const ageInDays = Math.max(
    0,
    (now.getTime() - lastCommitAt.getTime()) / 86_400_000,
  );
  const decayedDays = Math.min(ageInDays, DECAY_WINDOW_DAYS);

  return (DECAY_WINDOW_DAYS - decayedDays) * RECENCY_WEIGHT;
}

export function computeTrendingScore(
  votesCount: number,
  githubStars: number,
  lastCommitAt: Date | null,
  now: Date = new Date(),
): number {
  return votesCount * 2 + githubStars + computeRecencyBonus(lastCommitAt, now);
}

function mapRow(row: RawTrendingRow): TrendingServerItem {
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
    trendingScore: Number(row.trending_score),
  };
}

export class TrendingService {
  constructor(private readonly database: DbClient = db) {}

  async getTopTrending(limit = 10): Promise<TrendingServerItem[]> {
    const boundedLimit = Math.min(100, Math.max(1, limit));

    const rows = await this.database.execute<RawTrendingRow>(sql`
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
        ) AS tags,
        (
          (s.votes_count * 2)
          + s.github_stars
          + (30 - LEAST(EXTRACT(DAY FROM NOW() - COALESCE(s.last_commit_at, s.created_at)), 30)) * 3
        ) AS trending_score
      FROM servers s
      LEFT JOIN server_categories sc ON sc.server_id = s.id
      LEFT JOIN categories c ON c.id = sc.category_id
      LEFT JOIN server_tags st ON st.server_id = s.id
      LEFT JOIN tags t ON t.id = st.tag_id
      GROUP BY
        s.id, s.name, s.slug, s.description, s.github_url, s.website_url,
        s.author_id, s.votes_count, s.favorites_count, s.readme_content,
        s.github_stars, s.github_forks, s.open_issues, s.last_commit_at,
        s.search_vector, s.created_at, s.updated_at
      ORDER BY trending_score DESC, s.created_at DESC
      LIMIT ${boundedLimit}
    `);

    return (rows as RawTrendingRow[]).map(mapRow);
  }
}
