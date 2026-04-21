import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Feed } from 'feed';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apiCache } from '../lib/cache.js';

const FEED_CACHE_TTL_SECONDS = 300;
const FEED_LIMIT = 50;

const REGISTRY_URL = process.env.PUBLIC_URL ?? 'https://mcp-registry.example.com';
const REGISTRY_TITLE = 'MCP Discovery Registry';
const REGISTRY_DESCRIPTION =
  'Discover, compare, and share Model Context Protocol servers.';

interface RawFeedServer extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string;
  github_url: string;
  created_at: Date | string;
  category_slugs: string[] | null;
}

async function buildFeed(categorySlug?: string): Promise<Feed> {
  const whereClause = categorySlug
    ? sql`
        WHERE s.moderation_status = 'active'
          AND EXISTS (
            SELECT 1 FROM server_categories sc
            INNER JOIN categories c ON c.id = sc.category_id
            WHERE sc.server_id = s.id AND c.slug = ${categorySlug}
          )
      `
    : sql`WHERE s.moderation_status = 'active'`;

  const rows = await db.execute<RawFeedServer>(sql`
    SELECT
      s.id,
      s.name,
      s.slug,
      s.description,
      s.github_url,
      s.created_at,
      ARRAY_AGG(DISTINCT c.slug) FILTER (WHERE c.slug IS NOT NULL) AS category_slugs
    FROM servers s
    LEFT JOIN server_categories sc ON sc.server_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    ${whereClause}
    GROUP BY s.id, s.name, s.slug, s.description, s.github_url, s.created_at
    ORDER BY s.created_at DESC
    LIMIT ${FEED_LIMIT}
  `);

  const feed = new Feed({
    title: REGISTRY_TITLE,
    description: REGISTRY_DESCRIPTION,
    id: REGISTRY_URL,
    link: REGISTRY_URL,
    language: 'en',
    updated: new Date(),
    copyright: `${new Date().getFullYear()} MCP Discovery Registry`,
    generator: 'MCP Discovery Registry Feed',
    feedLinks: {
      rss: `${REGISTRY_URL}/feeds/rss.xml`,
      atom: `${REGISTRY_URL}/feeds/atom.xml`,
    },
  });

  for (const row of rows as RawFeedServer[]) {
    const serverUrl = `${REGISTRY_URL}/servers/${row.slug}`;
    const createdAt =
      row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string);

    feed.addItem({
      title: row.name,
      id: serverUrl,
      link: serverUrl,
      description: row.description || 'No description available.',
      date: createdAt,
      category: (row.category_slugs ?? []).map((slug) => ({ name: slug })),
    });
  }

  return feed;
}

export function createFeedsRouter(): Router {
  const router = Router();

  router.get('/rss.xml', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const cacheKey = `feed:rss:${category ?? '_all'}`;

      const cached = apiCache.get<string>(cacheKey);

      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(cached);
        return;
      }

      const feed = await buildFeed(category);
      const rss = feed.rss2();

      apiCache.set(cacheKey, rss, FEED_CACHE_TTL_SECONDS);

      res.set('X-Cache', 'MISS');
      res.set('Content-Type', 'application/rss+xml; charset=utf-8');
      res.send(rss);
    } catch (error) {
      next(error);
    }
  });

  router.get('/atom.xml', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const cacheKey = `feed:atom:${category ?? '_all'}`;

      const cached = apiCache.get<string>(cacheKey);

      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        res.set('Content-Type', 'application/atom+xml; charset=utf-8');
        res.send(cached);
        return;
      }

      const feed = await buildFeed(category);
      const atom = feed.atom1();

      apiCache.set(cacheKey, atom, FEED_CACHE_TTL_SECONDS);

      res.set('X-Cache', 'MISS');
      res.set('Content-Type', 'application/atom+xml; charset=utf-8');
      res.send(atom);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
