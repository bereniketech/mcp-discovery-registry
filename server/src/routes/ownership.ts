import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import type { OwnershipService } from '../services/ownership.js';

function paramStr(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const patchServerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
});

export function createOwnershipRouter(ownershipService: OwnershipService): Router {
  const router = Router({ mergeParams: true });

  // POST /api/v1/servers/:id/claim/init — start ownership claim
  router.post('/:id/claim/init', requireAuth, async (req, res, next) => {
    try {
      const result = await ownershipService.initClaim(paramStr(req.params.id), req.user?.id ?? '');
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/servers/:id/claim/verify — verify claim token
  router.post('/:id/claim/verify', requireAuth, async (req, res, next) => {
    try {
      const result = await ownershipService.verifyClaim(paramStr(req.params.id), req.user?.id ?? '');
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/v1/servers/:id — owner-only edit of name/description
  router.patch('/:id', requireAuth, validateBody(patchServerSchema), async (req, res, next) => {
    try {
      const updated = await ownershipService.updateListing(
        paramStr(req.params.id),
        req.user?.id ?? '',
        {
          name: req.body.name as string | undefined,
          description: req.body.description as string | undefined,
        },
      );
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
