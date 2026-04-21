import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { servers, votes } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';

type DbClient = typeof db;

export interface VoteToggleResult {
  voted: boolean;
  votesCount: number;
}

export class VoteService {
  constructor(private readonly database: DbClient = db) {}

  async toggleVote(params: { userId: string; serverId: string }): Promise<VoteToggleResult> {
    return this.database.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, params.serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      const existingVotes = await tx
        .select({ id: votes.id })
        .from(votes)
        .where(and(eq(votes.userId, params.userId), eq(votes.serverId, params.serverId)))
        .limit(1);

      const hasExistingVote = Boolean(existingVotes[0]);

      if (hasExistingVote) {
        await tx
          .delete(votes)
          .where(and(eq(votes.userId, params.userId), eq(votes.serverId, params.serverId)));
      } else {
        await tx.insert(votes).values({
          userId: params.userId,
          serverId: params.serverId,
        });
      }

      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(votes)
        .where(eq(votes.serverId, params.serverId));

      const votesCount = Number(countRows[0]?.count ?? 0);

      await tx
        .update(servers)
        .set({ votesCount })
        .where(eq(servers.id, params.serverId));

      return {
        voted: !hasExistingVote,
        votesCount,
      };
    });
  }
}
