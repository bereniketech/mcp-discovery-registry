import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { comments, servers, users } from '../db/schema.js';
import { AppError } from '../utils/app-error.js';
import type { PaginatedResult } from '../routes/me.js';

type DbClient = typeof db;

export interface CommentRow {
  id: string;
  serverId: string;
  userId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

const SOFT_DELETE_BODY = '[deleted]';

export class CommentService {
  constructor(private readonly database: DbClient = db) {}

  async list(
    serverId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<CommentRow>> {
    const offset = (page - 1) * perPage;

    const [rows, totalRows] = await Promise.all([
      this.database
        .select({
          id: comments.id,
          serverId: comments.serverId,
          userId: comments.userId,
          parentId: comments.parentId,
          body: comments.body,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          authorId: users.id,
          authorUsername: users.username,
          authorDisplayName: users.displayName,
          authorAvatarUrl: users.avatarUrl,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(and(eq(comments.serverId, serverId), isNull(comments.parentId)))
        .orderBy(asc(comments.createdAt))
        .limit(perPage)
        .offset(offset),
      this.database
        .select({ total: count() })
        .from(comments)
        .where(and(eq(comments.serverId, serverId), isNull(comments.parentId))),
    ]);

    const topLevelIds = rows.map((r) => r.id);

    // Fetch first-level replies for the top-level comments
    const replies = topLevelIds.length > 0
      ? await this.database
          .select({
            id: comments.id,
            serverId: comments.serverId,
            userId: comments.userId,
            parentId: comments.parentId,
            body: comments.body,
            createdAt: comments.createdAt,
            updatedAt: comments.updatedAt,
            authorId: users.id,
            authorUsername: users.username,
            authorDisplayName: users.displayName,
            authorAvatarUrl: users.avatarUrl,
          })
          .from(comments)
          .innerJoin(users, eq(comments.userId, users.id))
          .where(
            and(
              eq(comments.serverId, serverId),
              sql`${comments.parentId} = ANY(ARRAY[${sql.join(topLevelIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
            ),
          )
          .orderBy(asc(comments.createdAt))
      : [];

    const toCommentRow = (row: typeof rows[number]): CommentRow => ({
      id: row.id,
      serverId: row.serverId,
      userId: row.userId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      },
    });

    return {
      data: [...rows.map(toCommentRow), ...replies.map(toCommentRow)],
      meta: {
        page,
        per_page: perPage,
        total: Number(totalRows[0]?.total ?? 0),
      },
    };
  }

  async create(
    serverId: string,
    userId: string,
    body: string,
    parentId?: string,
  ): Promise<CommentRow> {
    return this.database.transaction(async (tx) => {
      const serverRows = await tx
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      if (parentId) {
        const parentRows = await tx
          .select({ id: comments.id })
          .from(comments)
          .where(and(eq(comments.id, parentId), eq(comments.serverId, serverId)))
          .limit(1);

        if (!parentRows[0]) {
          throw new AppError('Parent comment not found', 404, 'comment_not_found');
        }
      }

      const [inserted] = await tx
        .insert(comments)
        .values({ serverId, userId, body, parentId: parentId ?? null })
        .returning();

      if (!inserted) {
        throw new AppError('Failed to create comment', 500, 'comment_create_failed');
      }

      // Increment commentsCount only for top-level comments
      if (!parentId) {
        await tx
          .update(servers)
          .set({ commentsCount: sql`${servers.commentsCount} + 1` })
          .where(eq(servers.id, serverId));
      }

      const authorRows = await tx
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const author = authorRows[0] ?? { id: userId, username: '', displayName: '', avatarUrl: null };

      return {
        id: inserted.id,
        serverId: inserted.serverId,
        userId: inserted.userId,
        parentId: inserted.parentId,
        body: inserted.body,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
        author,
      };
    });
  }

  async update(commentId: string, userId: string, body: string): Promise<CommentRow> {
    return this.database.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!existing[0]) {
        throw new AppError('Comment not found', 404, 'comment_not_found');
      }

      if (existing[0].userId !== userId) {
        throw new AppError('Forbidden', 403, 'forbidden');
      }

      const [updated] = await tx
        .update(comments)
        .set({ body, updatedAt: new Date() })
        .where(eq(comments.id, commentId))
        .returning();

      if (!updated) {
        throw new AppError('Failed to update comment', 500, 'comment_update_failed');
      }

      const authorRows = await tx
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const author = authorRows[0] ?? { id: userId, username: '', displayName: '', avatarUrl: null };

      return {
        id: updated.id,
        serverId: updated.serverId,
        userId: updated.userId,
        parentId: updated.parentId,
        body: updated.body,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        author,
      };
    });
  }

  async delete(commentId: string, userId: string): Promise<void> {
    const existing = await this.database
      .select({ userId: comments.userId, parentId: comments.parentId, serverId: comments.serverId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existing[0]) {
      throw new AppError('Comment not found', 404, 'comment_not_found');
    }

    if (existing[0].userId !== userId) {
      throw new AppError('Forbidden', 403, 'forbidden');
    }

    // Soft-delete: replace body with [deleted], keep row for thread integrity
    await this.database
      .update(comments)
      .set({ body: SOFT_DELETE_BODY, updatedAt: new Date() })
      .where(eq(comments.id, commentId));

    // Decrement commentsCount for top-level comments only
    if (!existing[0].parentId) {
      await this.database
        .update(servers)
        .set({ commentsCount: sql`GREATEST(0, ${servers.commentsCount} - 1)` })
        .where(eq(servers.id, existing[0].serverId));
    }
  }

  async getById(commentId: string): Promise<CommentRow | null> {
    const rows = await this.database
      .select({
        id: comments.id,
        serverId: comments.serverId,
        userId: comments.userId,
        parentId: comments.parentId,
        body: comments.body,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        authorId: users.id,
        authorUsername: users.username,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, commentId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      serverId: row.serverId,
      userId: row.userId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
      },
    };
  }
}

export { desc };
