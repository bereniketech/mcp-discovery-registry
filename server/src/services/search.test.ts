import { describe, expect, it, vi } from 'vitest';

// Must be hoisted before search.ts imports db/index.ts
vi.mock('../db/index.js', () => ({ db: {} }));

import { buildTsQueryString, computeCompositeScore, SearchService } from './search.js';

// ─── Unit: buildTsQueryString ─────────────────────────────────────────────────

describe('buildTsQueryString', () => {
  it('joins single word as-is', () => {
    expect(buildTsQueryString('postgres')).toBe('postgres');
  });

  it('joins multiple words with &', () => {
    expect(buildTsQueryString('file system')).toBe('file & system');
  });

  it('strips special characters', () => {
    expect(buildTsQueryString("git; DROP TABLE servers--")).toBe('git & DROP & TABLE & servers--');
  });

  it('returns null for blank string', () => {
    expect(buildTsQueryString('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(buildTsQueryString('   ')).toBeNull();
  });

  it('ignores empty tokens after sanitization', () => {
    expect(buildTsQueryString('a  b')).toBe('a & b');
  });
});

// ─── Unit: computeCompositeScore ─────────────────────────────────────────────

describe('computeCompositeScore', () => {
  it('returns higher score for higher ts_rank', () => {
    const date = new Date();
    const low = computeCompositeScore(0, 0, 0, date);
    const high = computeCompositeScore(1, 0, 0, date);
    expect(high).toBeGreaterThan(low);
  });

  it('votes weight is double stars weight', () => {
    // Use epoch (very old) so recency bonus ≈ 0, isolating the weights
    const veryOld = new Date(0);
    const scoreVotes = computeCompositeScore(0, 1, 0, veryOld);
    const scoreStars = computeCompositeScore(0, 0, 1, veryOld);
    expect(scoreVotes).toBeCloseTo(scoreStars * 2, 5);
  });

  it('newer server scores higher than older server for equal other factors', () => {
    const now = new Date();
    const old = new Date(Date.now() - 90 * 86_400_000); // 90 days ago
    const scoreNew = computeCompositeScore(0, 0, 0, now);
    const scoreOld = computeCompositeScore(0, 0, 0, old);
    expect(scoreNew).toBeGreaterThan(scoreOld);
  });

  it('returns 0 for all-zero inputs on very old server', () => {
    const veryOld = new Date(1970, 0, 1);
    const score = computeCompositeScore(0, 0, 0, veryOld);
    // recency bonus approaches 0, so score approaches 0
    expect(score).toBeCloseTo(0, 1);
  });
});

// ─── Unit: SearchService.search (mocked db) ───────────────────────────────────

function makeMockDb(countRows: unknown[], dataRows: unknown[]) {
  let callCount = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      const result = callCount === 0 ? countRows : dataRows;
      callCount++;
      return Promise.resolve(result);
    }),
  };
}

const baseRow = {
  id: 'uuid-1',
  name: 'Test Server',
  slug: 'test-server',
  description: 'A test MCP server',
  github_url: 'https://github.com/org/test',
  website_url: null,
  author_id: 'user-1',
  votes_count: 5,
  favorites_count: 1,
  readme_content: null,
  github_stars: 10,
  github_forks: 2,
  open_issues: 0,
  last_commit_at: null,
  search_vector: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  categories: ['utilities'],
  tags: ['cli'],
};

describe('SearchService.search', () => {
  it('returns paginated result with correct meta', async () => {
    const mockDb = makeMockDb([{ total: 1 }], [baseRow]);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({ page: 1, perPage: 20 });

    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.totalItems).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('maps snake_case row to camelCase item', async () => {
    const mockDb = makeMockDb([{ total: 1 }], [baseRow]);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({});
    const item = result.items[0];

    expect(item).toBeDefined();
    expect(item!.githubUrl).toBe('https://github.com/org/test');
    expect(item!.votesCount).toBe(5);
    expect(item!.githubStars).toBe(10);
    expect(item!.categories).toEqual(['utilities']);
    expect(item!.tags).toEqual(['cli']);
  });

  it('returns empty items when no rows', async () => {
    const mockDb = makeMockDb([{ total: 0 }], []);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({});

    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('clamps perPage to max 100', async () => {
    const mockDb = makeMockDb([{ total: 0 }], []);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    // We cannot inspect the SQL directly, but we verify no crash and result shape
    const result = await service.search({ perPage: 999 });
    expect(result.perPage).toBe(100);
  });

  it('defaults to page 1 and perPage 20', async () => {
    const mockDb = makeMockDb([{ total: 0 }], []);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({});
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
  });

  it('computes correct totalPages', async () => {
    const mockDb = makeMockDb([{ total: 45 }], []);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({ perPage: 20 });
    expect(result.totalPages).toBe(3);
  });

  it('handles null categories/tags gracefully', async () => {
    const rowWithNulls = { ...baseRow, categories: null, tags: null };
    const mockDb = makeMockDb([{ total: 1 }], [rowWithNulls]);
    const service = new SearchService(mockDb as unknown as typeof import('../db/index.js').db);

    const result = await service.search({});
    expect(result.items[0]?.categories).toEqual([]);
    expect(result.items[0]?.tags).toEqual([]);
  });
});
