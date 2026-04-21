import { Router } from 'express';
import { asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { cacheResponse } from '../middleware/cache-middleware.js';

const CATEGORIES_CACHE_TTL_SECONDS = 300;

export function createCategoriesRouter(): Router {
  const router = Router();

  router.get('/', cacheResponse(CATEGORIES_CACHE_TTL_SECONDS), async (_req, res, next) => {
    try {
      const rows = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          displayOrder: categories.displayOrder,
        })
        .from(categories)
        .orderBy(asc(categories.displayOrder), asc(categories.name));

      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createCategoriesRouter;
