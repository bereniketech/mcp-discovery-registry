import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createServersRouter } from './servers.js';
import { errorHandler } from '../middleware/error.js';
import { AppError } from '../utils/app-error.js';

function createTestApp(service: {
  create: ReturnType<typeof vi.fn>;
  preview: ReturnType<typeof vi.fn>;
  getBySlug: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/servers', createServersRouter(service));
  app.use(errorHandler);
  return app;
}

async function createAuthToken(userId: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET ?? 'test-secret';
  return new SignJWT({ email: 'u@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

describe('servers routes', () => {
  let originalJwtSecret: string | undefined;

  beforeAll(() => {
    originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
  });

  it('returns 401 for POST without auth token', async () => {
    const service = {
      create: vi.fn(),
      preview: vi.fn(),
      getBySlug: vi.fn(),
      list: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_url: 'https://github.com/org/repo' }),
    });

    server.close();

    expect(response.status).toBe(401);
  });

  it('returns created server for valid POST request', async () => {
    const token = await createAuthToken('user-1');

    const service = {
      create: vi.fn().mockResolvedValue({
        id: 'server-1',
        slug: 'repo',
        name: 'repo',
        description: 'desc',
        githubUrl: 'https://github.com/org/repo',
        websiteUrl: null,
        authorId: 'user-1',
        votesCount: 0,
        favoritesCount: 0,
        readmeContent: null,
        githubStars: 1,
        githubForks: 1,
        openIssues: 0,
        lastCommitAt: null,
        searchVector: null,
        createdAt: new Date('2026-04-01T00:00:00Z'),
        updatedAt: new Date('2026-04-01T00:00:00Z'),
        categories: [],
        tags: [],
      }),
      preview: vi.fn(),
      getBySlug: vi.fn(),
      list: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ github_url: 'https://github.com/org/repo' }),
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(201);
    expect(json).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'repo' }),
      }),
    );
    expect(service.create).toHaveBeenCalledWith({
      githubUrl: 'https://github.com/org/repo',
      userId: 'user-1',
      categorySlugs: [],
    });
  });

  it('returns preview metadata for valid preview request', async () => {
    const token = await createAuthToken('user-1');
    const service = {
      create: vi.fn(),
      preview: vi.fn().mockResolvedValue({
        name: 'repo',
        description: 'preview desc',
        githubUrl: 'https://github.com/org/repo',
        githubStars: 22,
        githubForks: 3,
        openIssues: 1,
        lastCommitAt: null,
      }),
      getBySlug: vi.fn(),
      list: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ github_url: 'https://github.com/org/repo' }),
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ githubUrl: 'https://github.com/org/repo' }),
      }),
    );
    expect(service.preview).toHaveBeenCalledWith('https://github.com/org/repo');
  });

  it('returns 409 when duplicate server is submitted', async () => {
    const token = await createAuthToken('user-1');

    const service = {
      create: vi.fn().mockRejectedValue(new AppError('This server is already registered.', 409, 'duplicate_server')),
      preview: vi.fn(),
      getBySlug: vi.fn(),
      list: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ github_url: 'https://github.com/org/repo' }),
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(409);
    expect(json).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'duplicate_server' }),
      }),
    );
  });

  it('returns server detail for GET by slug', async () => {
    const service = {
      create: vi.fn(),
      preview: vi.fn(),
      getBySlug: vi.fn().mockResolvedValue({ slug: 'repo', categories: ['utilities'], tags: ['cli'] }),
      list: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/repo`);
    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json).toEqual({ data: { slug: 'repo', categories: ['utilities'], tags: ['cli'] } });
  });

  describe('GET / — list with search params', () => {
    function makeListResult(items: unknown[] = [], total = 0) {
      return {
        items,
        page: 1,
        perPage: 20,
        totalItems: total,
        totalPages: total === 0 ? 0 : Math.ceil(total / 20),
      };
    }

    it('passes q param to service list', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      await fetch(`http://127.0.0.1:${port}/api/v1/servers?q=postgres`);
      srv.close();

      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ q: 'postgres' }));
    });

    it('passes category param to service list', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      await fetch(`http://127.0.0.1:${port}/api/v1/servers?category=utilities`);
      srv.close();

      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ category: 'utilities' }));
    });

    it('passes tags array to service list', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      await fetch(`http://127.0.0.1:${port}/api/v1/servers?tags[]=cli&tags[]=sse`);
      srv.close();

      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.arrayContaining(['cli', 'sse']) }),
      );
    });

    it('passes sort param to service list', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      await fetch(`http://127.0.0.1:${port}/api/v1/servers?sort=stars`);
      srv.close();

      expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ sort: 'stars' }));
    });

    it('returns 422 for invalid sort value', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers?sort=invalid`);
      srv.close();

      expect(response.status).toBe(422);
    });

    it('returns correct meta in pagination response', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue({
          items: [],
          page: 2,
          perPage: 10,
          totalItems: 25,
          totalPages: 3,
        }),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers?page=2&per_page=10`);
      const json = (await response.json()) as { meta: unknown };
      srv.close();

      expect(response.status).toBe(200);
      expect(json.meta).toEqual({ page: 2, per_page: 10, total: 25, total_pages: 3 });
    });

    it('passes all search filters combined', async () => {
      const service = {
        create: vi.fn(),
        preview: vi.fn(),
        getBySlug: vi.fn(),
        list: vi.fn().mockResolvedValue(makeListResult()),
      };

      const app = createTestApp(service);
      const srv = app.listen(0);
      const { port } = srv.address() as AddressInfo;

      await fetch(
        `http://127.0.0.1:${port}/api/v1/servers?q=mcp&category=utilities&tags[]=cli&sort=newest&page=1&per_page=20`,
      );
      srv.close();

      expect(service.list).toHaveBeenCalledWith({
        q: 'mcp',
        category: 'utilities',
        tags: ['cli'],
        sort: 'newest',
        page: 1,
        perPage: 20,
      });
    });
  });
});
