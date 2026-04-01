import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createServerActionsRouter } from './server-actions.js';
import { errorHandler } from '../middleware/error.js';
import { AppError } from '../utils/app-error.js';

function createTestApp(services: {
  toggleVote: ReturnType<typeof vi.fn>;
  toggleFavorite: ReturnType<typeof vi.fn>;
  addTagToServer: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/servers', createServerActionsRouter(services, services, services));
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

describe('server actions routes', () => {
  let originalJwtSecret: string | undefined;

  beforeAll(() => {
    originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
  });

  it('returns 401 for unauthenticated vote toggle', async () => {
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn(),
      addTagToServer: vi.fn(),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/vote`, {
      method: 'POST',
    });

    server.close();
    expect(response.status).toBe(401);
  });

  it('returns 401 for unauthenticated favorite toggle', async () => {
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn(),
      addTagToServer: vi.fn(),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/favorite`, {
      method: 'POST',
    });

    server.close();
    expect(response.status).toBe(401);
  });

  it('returns 401 for unauthenticated tag creation', async () => {
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn(),
      addTagToServer: vi.fn(),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'cli' }),
    });

    server.close();
    expect(response.status).toBe(401);
  });

  it('toggles vote for authenticated request', async () => {
    const token = await createAuthToken('user-1');
    const services = {
      toggleVote: vi.fn().mockResolvedValue({ voted: true, votesCount: 7 }),
      toggleFavorite: vi.fn(),
      addTagToServer: vi.fn(),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json).toEqual({ data: { voted: true, votesCount: 7 } });
    expect(services.toggleVote).toHaveBeenCalledWith({ userId: 'user-1', serverId: 'server-1' });
  });

  it('toggles favorite for authenticated request', async () => {
    const token = await createAuthToken('user-1');
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn().mockResolvedValue({ favorited: true, favoritesCount: 4 }),
      addTagToServer: vi.fn(),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(200);
    expect(json).toEqual({ data: { favorited: true, favoritesCount: 4 } });
    expect(services.toggleFavorite).toHaveBeenCalledWith({ userId: 'user-1', serverId: 'server-1' });
  });

  it('creates tag with normalized payload and returns 201', async () => {
    const token = await createAuthToken('user-1');
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn(),
      addTagToServer: vi.fn().mockResolvedValue({
        tagId: 'tag-1',
        tag: 'developer-tools',
        serverId: 'server-1',
      }),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tag: 'Developer Tools' }),
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(201);
    expect(json).toEqual({
      data: {
        tagId: 'tag-1',
        tag: 'developer-tools',
        serverId: 'server-1',
      },
    });
    expect(services.addTagToServer).toHaveBeenCalledWith({
      userId: 'user-1',
      serverId: 'server-1',
      tag: 'Developer Tools',
    });
  });

  it('returns 409 when duplicate tag is submitted', async () => {
    const token = await createAuthToken('user-1');
    const services = {
      toggleVote: vi.fn(),
      toggleFavorite: vi.fn(),
      addTagToServer: vi
        .fn()
        .mockRejectedValue(new AppError('Tag already exists on this server', 409, 'duplicate_tag')),
    };

    const app = createTestApp(services);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tag: 'developer-tools' }),
    });

    const json = await response.json();
    server.close();

    expect(response.status).toBe(409);
    expect(json).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'duplicate_tag' }),
      }),
    );
  });
});
