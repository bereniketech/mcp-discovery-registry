import { Router } from 'express';
import { z } from 'zod';

const CACHE_TTL_MS = 60_000;

const trendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

type TrendingServiceContract = {
  getTopTrending: (limit?: number) => Promise<unknown[]>;
};

interface CacheEntry {
  expiresAt: number;
  data: unknown[];
}

export function createTrendingRouter(service: TrendingServiceContract): Router {
  const router = Router();
  const responseCache = new Map<number, CacheEntry>();

  router.get('/', async (req, res, next) => {
    const parsed = trendingQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const details = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details,
          status: 422,
        },
      });
      return;
    }

    const limit = parsed.data.limit ?? 10;
    const now = Date.now();
    const cached = responseCache.get(limit);

    if (cached && cached.expiresAt > now) {
      res.json({ data: cached.data });
      return;
    }

    try {
      const data = await service.getTopTrending(limit);
      responseCache.set(limit, {
        data,
        expiresAt: now + CACHE_TTL_MS,
      });
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createTrendingRouter;
