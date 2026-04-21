import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createMeRouter } from './me.js';
import { errorHandler } from '../middleware/error.js';
import type { PaginatedResult } from './me.js';

function makePagedResult<T>(items: T[]): PaginatedResult<T> {
  return {
    data: items,
    meta: { page: 1, per_page: 20, total: items.length },
  };
}

function createTestApp(service: {
  listFavoritesByUser: ReturnType<typeof vi.fn>;
  listByAuthor: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use('/api/v1/me', createMeRouter(service));
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

describe('me routes', () => {
  let originalJwtSecret: string | undefined;

  beforeAll(() => {
    originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
  });

  it('returns 401 for favorites without auth token', async () => {
    const service = {
      listFavoritesByUser: vi.fn(),
      listByAuthor: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/me/favorites`);

    server.close();
    expect(response.status).toBe(401);
  });

  it('returns user favorites for authenticated request with pagination meta', async () => {
    const token = await createAuthToken('user-1');
    const items = [{ id: 'server-1', slug: 'repo-1' }];
    const service = {
      listFavoritesByUser: vi.fn().mockResolvedValue(makePagedResult(items)),
      listByAuthor: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/me/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(items);
    expect(json.meta).toMatchObject({ page: 1, per_page: 20, total: 1 });
    expect(service.listFavoritesByUser).toHaveBeenCalledWith('user-1', { page: 1, perPage: 20 });
  });

  it('returns user submissions for authenticated request with pagination meta', async () => {
    const token = await createAuthToken('user-1');
    const items = [{ id: 'server-2', slug: 'repo-2' }];
    const service = {
      listFavoritesByUser: vi.fn(),
      listByAuthor: vi.fn().mockResolvedValue(makePagedResult(items)),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/me/submissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(items);
    expect(json.meta).toMatchObject({ page: 1, per_page: 20, total: 1 });
    expect(service.listByAuthor).toHaveBeenCalledWith('user-1', { page: 1, perPage: 20 });
  });

  it('passes page and per_page query params to service', async () => {
    const token = await createAuthToken('user-1');
    const service = {
      listFavoritesByUser: vi.fn().mockResolvedValue(makePagedResult([])),
      listByAuthor: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    await fetch(`http://127.0.0.1:${port}/api/v1/me/favorites?page=2&per_page=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    server.close();
    expect(service.listFavoritesByUser).toHaveBeenCalledWith('user-1', { page: 2, perPage: 10 });
  });

  it('returns 422 for invalid pagination params', async () => {
    const token = await createAuthToken('user-1');
    const service = {
      listFavoritesByUser: vi.fn(),
      listByAuthor: vi.fn(),
    };

    const app = createTestApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/me/favorites?per_page=999`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    server.close();
    expect(response.status).toBe(422);
  });
});
