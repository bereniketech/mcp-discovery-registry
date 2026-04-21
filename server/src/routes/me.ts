import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}

type MeRouterContract = {
  listFavoritesByUser: (
    userId: string,
    pagination: { page: number; perPage: number },
  ) => Promise<PaginatedResult<unknown>>;
  listByAuthor: (
    userId: string,
    pagination: { page: number; perPage: number },
  ) => Promise<PaginatedResult<unknown>>;
};

export function createMeRouter(service: MeRouterContract): Router {
  const router = Router();

  router.get('/favorites', requireAuth, async (req, res, next) => {
    const parsed = paginationSchema.safeParse(req.query);

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

    try {
      const result = await service.listFavoritesByUser(req.user?.id ?? '', {
        page: parsed.data.page,
        perPage: parsed.data.per_page,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/submissions', requireAuth, async (req, res, next) => {
    const parsed = paginationSchema.safeParse(req.query);

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

    try {
      const result = await service.listByAuthor(req.user?.id ?? '', {
        page: parsed.data.page,
        perPage: parsed.data.per_page,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createMeRouter;
