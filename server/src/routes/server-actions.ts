import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { addTagSchema } from '../schemas/server.js';
import { apiCache } from '../lib/cache.js';

// Write rate limiter — 30 req/min per authenticated user (or IP for anonymous)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
});

type VoteServiceContract = {
  toggleVote: (params: { userId: string; serverId: string }) => Promise<unknown>;
};

type FavoriteServiceContract = {
  toggleFavorite: (params: { userId: string; serverId: string }) => Promise<unknown>;
};

type TagServiceContract = {
  addTagToServer: (params: { userId: string; serverId: string; tag: string }) => Promise<unknown>;
};

type RatingServiceContract = {
  upsert: (serverId: string, userId: string, score: number) => Promise<{ avg: number | null; count: number }>;
  remove: (serverId: string, userId: string) => Promise<{ avg: number | null; count: number }>;
};

const rateSchema = z.object({
  score: z.number().int().min(1).max(5),
});

export function createServerActionsRouter(
  voteService: VoteServiceContract,
  favoriteService: FavoriteServiceContract,
  tagService: TagServiceContract,
  ratingService?: RatingServiceContract,
): Router {
  const router = Router();

  // Apply writeLimiter at router level so all action routes are covered
  router.use(writeLimiter);

  function getServerIdFromParams(params: Record<string, string | string[] | undefined>): string {
    const raw = params.id;
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  }

  router.post('/:id/vote', requireAuth, async (req, res, next) => {
    try {
      const data = await voteService.toggleVote({
        userId: req.user?.id ?? '',
        serverId: getServerIdFromParams(req.params),
      });

      apiCache.flushAll();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/favorite', requireAuth, async (req, res, next) => {
    try {
      const data = await favoriteService.toggleFavorite({
        userId: req.user?.id ?? '',
        serverId: getServerIdFromParams(req.params),
      });

      apiCache.flushAll();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/tags', requireAuth, validateBody(addTagSchema), async (req, res, next) => {
    try {
      const data = await tagService.addTagToServer({
        userId: req.user?.id ?? '',
        serverId: getServerIdFromParams(req.params),
        tag: req.body.tag,
      });

      apiCache.flushAll();
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  });

  if (ratingService) {
    router.post('/:id/rate', requireAuth, validateBody(rateSchema), async (req, res, next) => {
      try {
        const data = await ratingService.upsert(
          getServerIdFromParams(req.params),
          req.user?.id ?? '',
          req.body.score as number,
        );
        apiCache.flushAll();
        res.json({ data });
      } catch (error) {
        next(error);
      }
    });

    router.delete('/:id/rate', requireAuth, async (req, res, next) => {
      try {
        const data = await ratingService.remove(
          getServerIdFromParams(req.params),
          req.user?.id ?? '',
        );
        apiCache.flushAll();
        res.json({ data });
      } catch (error) {
        next(error);
      }
    });
  }

  return router;
}

export default createServerActionsRouter;
