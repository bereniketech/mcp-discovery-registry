import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { servers, serverVersions } from '../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';
import { AppError } from '../utils/app-error.js';

function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
});

const PER_PAGE_DEFAULT = 10;

export function createVersionsRouter(): Router {
  const router = Router({ mergeParams: true });

  /**
   * GET /api/v1/servers/:id/versions
   * Returns paginated release history for a server, ordered newest first.
   */
  router.get('/', async (req, res, next) => {
    try {
      const serverId = getParam(req.params, 'id');

      const serverRows = await db
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      const parsed = pageQuerySchema.safeParse(req.query);
      const page = parsed.success ? parsed.data.page : 1;
      const perPage = parsed.success ? parsed.data.per_page : PER_PAGE_DEFAULT;
      const offset = (page - 1) * perPage;

      const [rows, totalRows] = await Promise.all([
        db
          .select()
          .from(serverVersions)
          .where(eq(serverVersions.serverId, serverId))
          .orderBy(desc(serverVersions.releasedAt))
          .limit(perPage)
          .offset(offset),
        db
          .select({ total: count() })
          .from(serverVersions)
          .where(eq(serverVersions.serverId, serverId)),
      ]);

      const total = Number(totalRows[0]?.total ?? 0);

      res.json({
        data: rows,
        meta: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createVersionsRouter;
