import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createServersRouter } from './servers.js';
import { errorHandler } from '../middleware/error.js';
import { AppError } from '../utils/app-error.js';

function createTestApp(service: {
  create: ReturnType<typeof vi.fn>;
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
    });
  });

  it('returns 409 when duplicate server is submitted', async () => {
    const token = await createAuthToken('user-1');

    const service = {
      create: vi.fn().mockRejectedValue(new AppError('This server is already registered.', 409, 'duplicate_server')),
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
});
