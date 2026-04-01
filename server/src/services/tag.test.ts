import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({ db: {} }));

import { normalizeTag } from './tag.js';

describe('normalizeTag', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalizeTag('  AI Tools  ')).toBe('ai-tools');
  });

  it('collapses special characters to single hyphens', () => {
    expect(normalizeTag('C++ & Rust')).toBe('c-rust');
  });

  it('returns empty string when tag has no alphanumeric characters', () => {
    expect(normalizeTag('---___---')).toBe('');
  });
});
