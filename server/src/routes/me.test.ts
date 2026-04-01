import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createMeRouter } from './me.js';
import { errorHandler } from '../middleware/error.js';

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

  it('returns user favorites for authenticated request', async () => {
    const token = await createAuthToken('user-1');
    const service = {
      listFavoritesByUser: vi.fn().mockResolvedValue([{ id: 'server-1', slug: 'repo-1' }]),
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
    expect(json).toEqual({ data: [{ id: 'server-1', slug: 'repo-1' }] });
    expect(service.listFavoritesByUser).toHaveBeenCalledWith('user-1');
  });

  it('returns user submissions for authenticated request', async () => {
    const token = await createAuthToken('user-1');
    const service = {
      listFavoritesByUser: vi.fn(),
      listByAuthor: vi.fn().mockResolvedValue([{ id: 'server-2', slug: 'repo-2' }]),
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
    expect(json).toEqual({ data: [{ id: 'server-2', slug: 'repo-2' }] });
    expect(service.listByAuthor).toHaveBeenCalledWith('user-1');
  });
});
