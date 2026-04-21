import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import type { CommentService } from '../services/comment.js';

function paramStr(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
});

const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export function createCommentsRouter(commentService: CommentService): Router {
  const router = Router({ mergeParams: true });

  // GET /api/v1/servers/:id/comments — list paginated top-level comments + first replies
  router.get('/:id/comments', async (req, res, next) => {
    const parsed = paginationSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
          status: 422,
        },
      });
      return;
    }

    try {
      const result = await commentService.list(paramStr(req.params.id), parsed.data.page, parsed.data.per_page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/servers/:id/comments — create comment (auth required)
  router.post('/:id/comments', requireAuth, validateBody(createCommentSchema), async (req, res, next) => {
    try {
      const comment = await commentService.create(
        paramStr(req.params.id),
        req.user?.id ?? '',
        req.body.body as string,
        req.body.parent_id as string | undefined,
      );
      res.status(201).json({ data: comment });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createCommentActionsRouter(commentService: CommentService): Router {
  const router = Router();

  // PATCH /api/v1/comments/:id — edit own comment body
  router.patch('/:id', requireAuth, validateBody(updateCommentSchema), async (req, res, next) => {
    try {
      const updated = await commentService.update(
        paramStr(req.params.id),
        req.user?.id ?? '',
        req.body.body as string,
      );
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/v1/comments/:id — soft-delete own comment
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      await commentService.delete(paramStr(req.params.id), req.user?.id ?? '');
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
