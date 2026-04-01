import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { favorites, servers } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';

type DbClient = typeof db;
type ServerRow = typeof servers.$inferSelect;

export interface FavoriteToggleResult {
  favorited: boolean;
  favoritesCount: number;
}

export class FavoriteService {
  constructor(private readonly database: DbClient = db) {}

  async toggleFavorite(params: { userId: string; serverId: string }): Promise<FavoriteToggleResult> {
    return this.database.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, params.serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      const existingFavorites = await tx
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, params.userId), eq(favorites.serverId, params.serverId)))
        .limit(1);

      const hasExistingFavorite = Boolean(existingFavorites[0]);

      if (hasExistingFavorite) {
        await tx
          .delete(favorites)
          .where(and(eq(favorites.userId, params.userId), eq(favorites.serverId, params.serverId)));
      } else {
        await tx.insert(favorites).values({
          userId: params.userId,
          serverId: params.serverId,
        });
      }

      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.serverId, params.serverId));

      const favoritesCount = Number(countRows[0]?.count ?? 0);

      await tx
        .update(servers)
        .set({ favoritesCount })
        .where(eq(servers.id, params.serverId));

      return {
        favorited: !hasExistingFavorite,
        favoritesCount,
      };
    });
  }

  async listFavoritesByUser(userId: string): Promise<ServerRow[]> {
    return this.database
      .select({
        id: servers.id,
        name: servers.name,
        slug: servers.slug,
        description: servers.description,
        githubUrl: servers.githubUrl,
        websiteUrl: servers.websiteUrl,
        authorId: servers.authorId,
        votesCount: servers.votesCount,
        favoritesCount: servers.favoritesCount,
        readmeContent: servers.readmeContent,
        githubStars: servers.githubStars,
        githubForks: servers.githubForks,
        openIssues: servers.openIssues,
        lastCommitAt: servers.lastCommitAt,
        searchVector: servers.searchVector,
        createdAt: servers.createdAt,
        updatedAt: servers.updatedAt,
      })
      .from(favorites)
      .innerJoin(servers, eq(favorites.serverId, servers.id))
      .where(eq(favorites.userId, userId));
  }
}
