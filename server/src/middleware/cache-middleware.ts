import type { Request, Response, NextFunction } from 'express';
import { apiCache } from '../lib/cache.js';

export function cacheResponse(ttlSeconds: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.originalUrl;
    const cached = apiCache.get<unknown>(key);

    if (cached !== undefined) {
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    res.set('X-Cache', 'MISS');

    const originalJson = res.json.bind(res) as (body: unknown) => Response;
    res.json = (body: unknown): Response => {
      apiCache.set(key, body, ttlSeconds);
      return originalJson(body);
    };

    next();
  };
}
