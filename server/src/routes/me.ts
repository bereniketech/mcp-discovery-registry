import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

type MeRouterContract = {
  listFavoritesByUser: (userId: string) => Promise<unknown[]>;
  listByAuthor: (userId: string) => Promise<unknown[]>;
};

export function createMeRouter(service: MeRouterContract): Router {
  const router = Router();

  router.get('/favorites', requireAuth, async (req, res, next) => {
    try {
      const data = await service.listFavoritesByUser(req.user?.id ?? '');
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/submissions', requireAuth, async (req, res, next) => {
    try {
      const data = await service.listByAuthor(req.user?.id ?? '');
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createMeRouter;
