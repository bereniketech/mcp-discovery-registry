import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { addTagSchema } from '../schemas/server.js';

type VoteServiceContract = {
  toggleVote: (params: { userId: string; serverId: string }) => Promise<unknown>;
};

type FavoriteServiceContract = {
  toggleFavorite: (params: { userId: string; serverId: string }) => Promise<unknown>;
};

type TagServiceContract = {
  addTagToServer: (params: { userId: string; serverId: string; tag: string }) => Promise<unknown>;
};

export function createServerActionsRouter(
  voteService: VoteServiceContract,
  favoriteService: FavoriteServiceContract,
  tagService: TagServiceContract,
): Router {
  const router = Router();

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

      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createServerActionsRouter;
