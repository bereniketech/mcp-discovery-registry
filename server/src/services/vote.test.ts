import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({ db: {} }));

import { VoteService } from './vote.js';

function whereResult<T>(rows: T[]) {
  return {
    limit: vi.fn().mockResolvedValue(rows),
    then: (onFulfilled: (value: T[]) => unknown) => Promise.resolve(rows).then(onFulfilled),
  };
}

function makeVoteDb(selectRows: unknown[][]) {
  const queue = [...selectRows];

  const tx = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => whereResult(queue.shift() ?? [])),
      })),
    })),
    delete: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  };

  return {
    transaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    tx,
  };
}

describe('VoteService.toggleVote', () => {
  it('creates vote when one does not exist', async () => {
    const mockDb = makeVoteDb([[{ id: 'server-1' }], [], [{ count: 1 }]]);
    const service = new VoteService(mockDb as unknown as never);

    const result = await service.toggleVote({ userId: 'user-1', serverId: 'server-1' });

    expect(result).toEqual({ voted: true, votesCount: 1 });
    expect(mockDb.tx.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.tx.delete).not.toHaveBeenCalled();
    expect(mockDb.tx.update).toHaveBeenCalledTimes(1);
  });

  it('removes vote when one already exists', async () => {
    const mockDb = makeVoteDb([[{ id: 'server-1' }], [{ id: 'vote-1' }], [{ count: 0 }]]);
    const service = new VoteService(mockDb as unknown as never);

    const result = await service.toggleVote({ userId: 'user-1', serverId: 'server-1' });

    expect(result).toEqual({ voted: false, votesCount: 0 });
    expect(mockDb.tx.delete).toHaveBeenCalledTimes(1);
    expect(mockDb.tx.insert).not.toHaveBeenCalled();
    expect(mockDb.tx.update).toHaveBeenCalledTimes(1);
  });
});
