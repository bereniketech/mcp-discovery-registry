import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createServerSchema, listServersQuerySchema, previewServerSchema } from '../schemas/server.js';
import { cacheResponse } from '../middleware/cache-middleware.js';
import { apiCache } from '../lib/cache.js';

const LIST_CACHE_TTL_SECONDS = 60;
const DETAIL_CACHE_TTL_SECONDS = 300;

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
});

type ServerServiceContract = {
  create: (params: { githubUrl: string; userId: string; categorySlugs?: string[] }) => Promise<unknown>;
  preview: (githubUrl: string) => Promise<unknown>;
  getBySlug: (slug: string) => Promise<unknown>;
  list: (params: {
    q?: string;
    category?: string;
    tags?: string[];
    sort?: 'trending' | 'newest' | 'stars' | 'votes';
    page?: number;
    perPage?: number;
    mcpVersion?: string;
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

  router.post('/preview', writeLimiter, requireAuth, validateBody(previewServerSchema), async (req, res, next) => {
    try {
      const preview = await serverService.preview(req.body.github_url);
      res.json({ data: preview });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', writeLimiter, requireAuth, validateBody(createServerSchema), async (req, res, next) => {
    try {
      const created = await serverService.create({
        githubUrl: req.body.github_url,
        userId: req.user?.id ?? '',
        categorySlugs: req.body.categories,
      });

      apiCache.flushAll();
      res.status(201).json({ data: created });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', cacheResponse(LIST_CACHE_TTL_SECONDS), async (req, res, next) => {
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
        mcpVersion?: string;
      } = {};

      if (parsed.data.q !== undefined) listParams.q = parsed.data.q;
      if (parsed.data.category !== undefined) listParams.category = parsed.data.category;
      if (parsed.data.tags !== undefined) listParams.tags = parsed.data.tags;
      if (parsed.data.sort !== undefined) listParams.sort = parsed.data.sort;
      if (parsed.data.page !== undefined) listParams.page = parsed.data.page;
      if (parsed.data.per_page !== undefined) listParams.perPage = parsed.data.per_page;
      if (parsed.data.mcp_version !== undefined) listParams.mcpVersion = parsed.data.mcp_version;

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

  router.get('/:slug', cacheResponse(DETAIL_CACHE_TTL_SECONDS), async (req, res, next) => {
    try {
      const slug = Array.isArray(req.params.slug) ? (req.params.slug[0] ?? '') : (req.params.slug ?? '');
      const server = await serverService.getBySlug(slug);
      res.json({ data: server });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createServersRouter;
