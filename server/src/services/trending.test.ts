import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({ db: {} }));

import { computeRecencyBonus, computeTrendingScore, TrendingService } from './trending.js';

describe('computeRecencyBonus', () => {
  it('returns max bonus for fresh commits', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const score = computeRecencyBonus(new Date('2026-04-01T00:00:00Z'), now);

    expect(score).toBe(90);
  });

  it('decays to 0 after 30 days', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const score = computeRecencyBonus(new Date('2026-02-15T00:00:00Z'), now);

    expect(score).toBe(0);
  });

  it('returns 0 when commit timestamp is missing', () => {
    expect(computeRecencyBonus(null)).toBe(0);
  });
});

describe('computeTrendingScore', () => {
  it('weights votes as double stars', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const noRecency = new Date('2026-02-01T00:00:00Z');

    const voteWeighted = computeTrendingScore(1, 0, noRecency, now);
    const starWeighted = computeTrendingScore(0, 1, noRecency, now);

    expect(voteWeighted).toBe(starWeighted * 2);
  });

  it('ranks recent lower-star server above stale higher-star server', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const recentLowStars = computeTrendingScore(4, 10, new Date('2026-03-31T00:00:00Z'), now);
    const staleHighStars = computeTrendingScore(4, 70, new Date('2025-12-01T00:00:00Z'), now);

    expect(recentLowStars).toBeGreaterThan(staleHighStars);
  });
});

describe('TrendingService.getTopTrending', () => {
  it('maps query rows and returns normalized values', async () => {
    const database = {
      execute: vi.fn().mockResolvedValue([
        {
          id: 'server-1',
          name: 'Server One',
          slug: 'server-one',
          description: 'desc',
          github_url: 'https://github.com/org/server-one',
          website_url: null,
          author_id: 'user-1',
          votes_count: '10',
          favorites_count: '2',
          readme_content: null,
          github_stars: '20',
          github_forks: '3',
          open_issues: '1',
          last_commit_at: '2026-03-01T00:00:00Z',
          search_vector: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          categories: null,
          tags: null,
          trending_score: '123.5',
        },
      ]),
    };

    const service = new TrendingService(database as unknown as typeof import('../db/index.js').db);
    const results = await service.getTopTrending(5);

    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'server-1',
      githubUrl: 'https://github.com/org/server-one',
      votesCount: 10,
      githubStars: 20,
      categories: [],
      tags: [],
      trendingScore: 123.5,
    });
    expect(results[0]?.lastCommitAt?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('bounds limit to 1..100 before querying', async () => {
    const database = {
      execute: vi.fn().mockResolvedValue([]),
    };

    const service = new TrendingService(database as unknown as typeof import('../db/index.js').db);

    await service.getTopTrending(0);
    await service.getTopTrending(500);

    expect(database.execute).toHaveBeenCalledTimes(2);
  });
});
