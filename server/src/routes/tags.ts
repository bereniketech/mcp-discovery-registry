import { Router } from 'express';
import { desc, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tags } from '../db/schema.js';
import { cacheResponse } from '../middleware/cache-middleware.js';

const TAGS_CACHE_TTL_SECONDS = 120;

const DEFAULT_LIMIT = 50;

export function createTagsRouter(): Router {
  const router = Router();

  router.get('/', cacheResponse(TAGS_CACHE_TTL_SECONDS), async (req, res, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

      const rows = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          usageCount: tags.usageCount,
        })
        .from(tags)
        .where(q ? ilike(tags.name, `${q}%`) : undefined)
        .orderBy(desc(tags.usageCount))
        .limit(DEFAULT_LIMIT);

      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createTagsRouter;
