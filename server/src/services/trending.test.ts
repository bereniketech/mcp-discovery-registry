import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({ db: {} }));

import { computeRecencyBonus, computeTrendingScore } from './trending.js';

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
