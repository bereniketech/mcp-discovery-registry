import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { serverTags, servers, tags } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';

type DbClient = typeof db;

export interface AddTagResult {
  tagId: string;
  tag: string;
  serverId: string;
}

export function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export class TagService {
  constructor(private readonly database: DbClient = db) {}

  async addTagToServer(params: { userId: string; serverId: string; tag: string }): Promise<AddTagResult> {
    return this.database.transaction(async (tx) => {
      const normalized = normalizeTag(params.tag);

      if (!normalized) {
        throw new AppError('Tag must contain letters or numbers', 422, 'invalid_tag');
      }

      const serverRows = await tx
        .select({ id: servers.id, authorId: servers.authorId })
        .from(servers)
        .where(eq(servers.id, params.serverId))
        .limit(1);

      const server = serverRows[0];

      if (!server) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      if (server.authorId !== params.userId) {
        throw new AppError('Only the server owner can add tags', 403, 'forbidden');
      }

      let tagId: string;
      const existingTagRows = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, normalized))
        .limit(1);

      if (existingTagRows[0]) {
        tagId = existingTagRows[0].id;
      } else {
        const insertedTags = await tx
          .insert(tags)
          .values({
            name: normalized,
            slug: normalized,
          })
          .returning({ id: tags.id });

        const inserted = insertedTags[0];
        if (!inserted) {
          throw new AppError('Failed to create tag', 500, 'tag_create_failed');
        }

        tagId = inserted.id;
      }

      const existingAssociation = await tx
        .select({ id: serverTags.id })
        .from(serverTags)
        .where(and(eq(serverTags.serverId, params.serverId), eq(serverTags.tagId, tagId)))
        .limit(1);

      if (existingAssociation[0]) {
        throw new AppError('Tag already exists on this server', 409, 'duplicate_tag');
      }

      await tx.insert(serverTags).values({
        serverId: params.serverId,
        tagId,
      });

      const usageRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(serverTags)
        .where(eq(serverTags.tagId, tagId));

      const usageCount = Number(usageRows[0]?.count ?? 0);

      await tx
        .update(tags)
        .set({ usageCount })
        .where(eq(tags.id, tagId));

      return {
        tagId,
        tag: normalized,
        serverId: params.serverId,
      };
    });
  }
}
