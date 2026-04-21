import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({ db: {} }));

import { AppError } from '../utils/app-error.js';
import { normalizeTag, TagService } from './tag.js';

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

describe('TagService.addTagToServer', () => {
  function createFluentChain(result: unknown) {
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
    };
  }

  function createInsertChain(result: unknown) {
    return {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue(result),
    };
  }

  function createUpdateChain() {
    return {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
  }

  it('creates and associates a new normalized tag for any authenticated user', async () => {
    const selectServer = createFluentChain([{ id: 'server-1' }]);
    const selectTagBySlug = createFluentChain([]);
    const selectAssociation = createFluentChain([]);
    const selectUsageCount = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectServer)
        .mockReturnValueOnce(selectTagBySlug)
        .mockReturnValueOnce(selectAssociation)
        .mockReturnValueOnce(selectUsageCount),
      insert: vi
        .fn()
        .mockReturnValueOnce(createInsertChain([{ id: 'tag-1' }]))
        .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue(createUpdateChain()),
    };

    const database = {
      transaction: vi.fn(async (callback: (txn: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = new TagService(database as unknown as typeof import('../db/index.js').db);
    const result = await service.addTagToServer({
      userId: 'user-1',
      serverId: 'server-1',
      tag: ' Developer Tools ',
    });

    expect(result).toEqual({
      tagId: 'tag-1',
      tag: 'developer-tools',
      serverId: 'server-1',
    });
  });

  it('returns duplicate_tag when server already has tag association', async () => {
    const selectServer = createFluentChain([{ id: 'server-1' }]);
    const selectTagBySlug = createFluentChain([{ id: 'tag-1' }]);
    const selectAssociation = createFluentChain([{ id: 'assoc-1' }]);

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectServer)
        .mockReturnValueOnce(selectTagBySlug)
        .mockReturnValueOnce(selectAssociation),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const database = {
      transaction: vi.fn(async (callback: (txn: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = new TagService(database as unknown as typeof import('../db/index.js').db);

    await expect(
      service.addTagToServer({ userId: 'user-1', serverId: 'server-1', tag: 'developer-tools' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'duplicate_tag',
    } satisfies Partial<AppError>);
  });

  it('allows a non-owner authenticated user to add a tag (community tagging)', async () => {
    const selectServer = createFluentChain([{ id: 'server-1' }]);
    const selectTagBySlug = createFluentChain([{ id: 'tag-2' }]);
    const selectAssociation = createFluentChain([]);
    const selectUsageCount = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectServer)
        .mockReturnValueOnce(selectTagBySlug)
        .mockReturnValueOnce(selectAssociation)
        .mockReturnValueOnce(selectUsageCount),
      insert: vi
        .fn()
        .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue(createUpdateChain()),
    };

    const database = {
      transaction: vi.fn(async (callback: (txn: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = new TagService(database as unknown as typeof import('../db/index.js').db);

    const result = await service.addTagToServer({
      userId: 'non-owner-user',
      serverId: 'server-1',
      tag: 'cli',
    });

    expect(result).toEqual({
      tagId: 'tag-2',
      tag: 'cli',
      serverId: 'server-1',
    });
  });
});
