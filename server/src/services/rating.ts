import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ratings, servers } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';

type DbClient = typeof db;

export interface RatingResult {
  avg: number | null;
  count: number;
}

async function recomputeRating(
  serverId: string,
  tx: Parameters<Parameters<DbClient['transaction']>[0]>[0],
): Promise<RatingResult> {
  const aggregateRows = await tx
    .select({ avg: avg(ratings.score), count: count() })
    .from(ratings)
    .where(eq(ratings.serverId, serverId));

  const aggregate = aggregateRows[0];
  const ratingAvg = aggregate?.avg != null ? Number(aggregate.avg) : null;
  const ratingCount = Number(aggregate?.count ?? 0);

  await tx
    .update(servers)
    .set({
      ratingAvg: ratingAvg != null ? String(ratingAvg.toFixed(2)) : null,
      ratingCount,
    })
    .where(eq(servers.id, serverId));

  return { avg: ratingAvg, count: ratingCount };
}

export class RatingService {
  constructor(private readonly database: DbClient = db) {}

  async upsert(serverId: string, userId: string, score: number): Promise<RatingResult> {
    if (score < 1 || score > 5) {
      throw new AppError('Score must be between 1 and 5', 422, 'invalid_score');
    }

    return this.database.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      // Upsert the rating
      await tx
        .insert(ratings)
        .values({ serverId, userId, score })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.serverId],
          set: { score, createdAt: new Date() },
        });

      return recomputeRating(serverId, tx);
    });
  }

  async remove(serverId: string, userId: string): Promise<RatingResult> {
    return this.database.transaction(async (tx) => {
      const existing = await tx
        .select({ id: ratings.id })
        .from(ratings)
        .where(and(eq(ratings.serverId, serverId), eq(ratings.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        throw new AppError('Rating not found', 404, 'rating_not_found');
      }

      await tx
        .delete(ratings)
        .where(and(eq(ratings.serverId, serverId), eq(ratings.userId, userId)));

      return recomputeRating(serverId, tx);
    });
  }
}
