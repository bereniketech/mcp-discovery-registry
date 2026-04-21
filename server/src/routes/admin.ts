import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { servers, reports, users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/app-error.js';
import { WebhookService } from '../services/webhook.js';

const reportReasonSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const webhookCreateSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(['discord', 'slack', 'generic']),
  events: z.array(z.string()).optional(),
  secret: z.string().optional(),
});

const webhookUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  type: z.enum(['discord', 'slack', 'generic']).optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * Middleware: requires the authenticated user to have is_admin = true.
 * Must be applied after requireAuth.
 */
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required', status: 401 } });
    return;
  }

  try {
    const rows = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = rows[0];

    if (!user?.isAdmin) {
      res.status(403).json({ error: { code: 'forbidden', message: 'Admin access required', status: 403 } });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function createAdminRouter(): Router {
  const router = Router();
  const webhookService = new WebhookService();

  /**
   * GET /api/v1/admin/webhooks
   * Lists all webhooks (requires admin). Secrets are never returned.
   */
  router.get('/webhooks', requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      const list = await webhookService.list();
      res.json({ data: list });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/v1/admin/webhooks
   * Creates a new webhook (requires admin).
   */
  router.post('/webhooks', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const parsed = webhookCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(422).json({
          error: { code: 'validation_error', message: 'Request validation failed', details, status: 422 },
        });
        return;
      }

      const created = await webhookService.create({
        name: parsed.data.name,
        url: parsed.data.url,
        type: parsed.data.type,
        ...(parsed.data.events !== undefined ? { events: parsed.data.events } : {}),
        ...(parsed.data.secret !== undefined ? { secret: parsed.data.secret } : {}),
      });

      res.status(201).json({ data: created });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/v1/admin/webhooks/:id
   * Updates an existing webhook (requires admin).
   */
  router.patch('/webhooks/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const webhookId = getParam(req.params, 'id');
      const parsed = webhookUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(422).json({
          error: { code: 'validation_error', message: 'Request validation failed', details, status: 422 },
        });
        return;
      }

      const updated = await webhookService.update(webhookId, {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
        ...(parsed.data.events !== undefined ? { events: parsed.data.events } : {}),
        ...(parsed.data.secret !== undefined ? { secret: parsed.data.secret } : {}),
        ...(parsed.data.is_active !== undefined ? { isActive: parsed.data.is_active } : {}),
      });

      if (!updated) {
        throw new AppError('Webhook not found', 404, 'webhook_not_found');
      }

      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/v1/admin/webhooks/:id
   * Deletes a webhook (requires admin).
   */
  router.delete('/webhooks/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const webhookId = getParam(req.params, 'id');
      const deleted = await webhookService.remove(webhookId);

      if (!deleted) {
        throw new AppError('Webhook not found', 404, 'webhook_not_found');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/v1/admin/servers
   * Lists servers that are flagged or removed (requires admin).
   */
  router.get('/servers', requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(servers)
        .where(inArray(servers.moderationStatus, ['flagged', 'removed']))
        .orderBy(servers.createdAt);

      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/v1/admin/servers/:id/flag
   * Sets moderation_status = 'flagged' (requires admin).
   */
  router.post('/servers/:id/flag', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const serverId = getParam(req.params, 'id');

      const updated = await db
        .update(servers)
        .set({ moderationStatus: 'flagged', updatedAt: new Date() })
        .where(eq(servers.id, serverId))
        .returning({ id: servers.id });

      if (!updated[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      res.json({ data: { id: serverId, moderationStatus: 'flagged' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/v1/admin/servers/:id
   * Soft-removes a server by setting moderation_status = 'removed' (requires admin).
   */
  router.delete('/servers/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const serverId = getParam(req.params, 'id');

      const updated = await db
        .update(servers)
        .set({ moderationStatus: 'removed', updatedAt: new Date() })
        .where(eq(servers.id, serverId))
        .returning({ id: servers.id });

      if (!updated[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      res.json({ data: { id: serverId, moderationStatus: 'removed' } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/v1/admin/reports/:id/dismiss
   * Dismisses a report (requires admin).
   */
  router.post('/reports/:id/dismiss', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const reportId = getParam(req.params, 'id');

      const updated = await db
        .update(reports)
        .set({ status: 'dismissed' })
        .where(eq(reports.id, reportId))
        .returning({ id: reports.id });

      if (!updated[0]) {
        throw new AppError('Report not found', 404, 'report_not_found');
      }

      res.json({ data: { id: reportId, status: 'dismissed' } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Creates the report endpoint for authenticated users.
 * POST /api/v1/servers/:id/report
 * Rate-limited to 3 reports per user per server per day.
 */
export function createReportRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const serverId = getParam(req.params, 'id');
      const userId = req.user?.id ?? '';

      const parsed = reportReasonSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(422).json({
          error: { code: 'validation_error', message: 'Request validation failed', details, status: 422 },
        });
        return;
      }

      // Verify server exists.
      const serverRows = await db
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!serverRows[0]) {
        throw new AppError('Server not found', 404, 'server_not_found');
      }

      // Rate-limit: max 3 reports per user per server per day.
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentCountResult = await db
        .select({ id: reports.id, createdAt: reports.createdAt })
        .from(reports)
        .where(
          and(
            eq(reports.serverId, serverId),
            eq(reports.reporterId, userId),
          ),
        );

      const withinDay = recentCountResult.filter((r) => r.createdAt > oneDayAgo);

      if (withinDay.length >= 3) {
        res.status(429).json({
          error: {
            code: 'rate_limited',
            message: 'You have already submitted 3 reports for this server today.',
            status: 429,
          },
        });
        return;
      }

      const [created] = await db
        .insert(reports)
        .values({
          serverId,
          reporterId: userId,
          reason: parsed.data.reason,
        })
        .returning();

      res.status(201).json({ data: created });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
