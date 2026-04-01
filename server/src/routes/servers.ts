import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createServerSchema, listServersQuerySchema } from '../schemas/server.js';

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
});

type ServerServiceContract = {
  create: (params: { githubUrl: string; userId: string }) => Promise<unknown>;
  getBySlug: (slug: string) => Promise<unknown>;
  list: (params: {
    q?: string;
    category?: string;
    tags?: string[];
    sort?: 'trending' | 'newest' | 'stars' | 'votes';
    page?: number;
    perPage?: number;
  }) => Promise<{
    items: unknown[];
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  }>;
};

export function createServersRouter(service: ServerServiceContract): Router {
  const router = Router();
  const serverService = service;

  router.post('/', writeLimiter, requireAuth, validateBody(createServerSchema), async (req, res, next) => {
    try {
      const created = await serverService.create({
        githubUrl: req.body.github_url,
        userId: req.user?.id ?? '',
      });

      res.status(201).json({ data: created });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    const parsed = listServersQuerySchema.safeParse(req.query);

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
      const listParams: {
        q?: string;
        category?: string;
        tags?: string[];
        sort?: 'trending' | 'newest' | 'stars' | 'votes';
        page?: number;
        perPage?: number;
      } = {};

      if (parsed.data.q !== undefined) listParams.q = parsed.data.q;
      if (parsed.data.category !== undefined) listParams.category = parsed.data.category;
      if (parsed.data.tags !== undefined) listParams.tags = parsed.data.tags;
      if (parsed.data.sort !== undefined) listParams.sort = parsed.data.sort;
      if (parsed.data.page !== undefined) listParams.page = parsed.data.page;
      if (parsed.data.per_page !== undefined) listParams.perPage = parsed.data.per_page;

      const result = await serverService.list(listParams);

      res.json({
        data: result.items,
        meta: {
          page: result.page,
          per_page: result.perPage,
          total: result.totalItems,
          total_pages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:slug', async (req, res, next) => {
    try {
      const server = await serverService.getBySlug(req.params.slug);
      res.json({ data: server });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createServersRouter;
