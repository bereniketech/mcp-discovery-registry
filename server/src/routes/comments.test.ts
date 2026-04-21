import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createCommentsRouter, createCommentActionsRouter } from './comments.js';
import { errorHandler } from '../middleware/error.js';
import { AppError } from '../utils/app-error.js';
import type { CommentService } from '../services/comment.js';

const JWT_SECRET = 'test-secret';

async function makeToken(userId: string): Promise<string> {
  return new SignJWT({ email: 'test@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

function buildApp(commentService: Partial<CommentService>) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/servers', createCommentsRouter(commentService as CommentService));
  app.use('/api/v1/comments', createCommentActionsRouter(commentService as CommentService));
  app.use(errorHandler);
  return app;
}

const sampleComment = {
  id: 'comment-1',
  serverId: 'server-1',
  userId: 'user-1',
  parentId: null,
  body: 'Great server!',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  author: { id: 'user-1', username: 'alice', displayName: 'Alice', avatarUrl: null },
};

describe('comments routes', () => {
  let originalJwtSecret: string | undefined;

  beforeAll(() => {
    originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
  });

  it('GET /:id/comments — returns paginated comments without auth', async () => {
    const service = {
      list: vi.fn().mockResolvedValue({
        data: [sampleComment],
        meta: { page: 1, per_page: 20, total: 1 },
      }),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/comments`);
    const json = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.meta.total).toBe(1);
    expect(service.list).toHaveBeenCalledWith('server-1', 1, 20);
  });

  it('POST /:id/comments — returns 401 without auth', async () => {
    const service = { create: vi.fn() };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'hello' }),
    });
    server.close();
    expect(res.status).toBe(401);
  });

  it('POST /:id/comments — creates comment for authenticated user', async () => {
    const token = await makeToken('user-1');
    const service = { create: vi.fn().mockResolvedValue(sampleComment) };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: 'Great server!' }),
    });
    const json = await res.json();
    server.close();

    expect(res.status).toBe(201);
    expect(json.data.body).toBe('Great server!');
    expect(service.create).toHaveBeenCalledWith('server-1', 'user-1', 'Great server!', undefined);
  });

  it('POST /:id/comments — validates body length', async () => {
    const token = await makeToken('user-1');
    const service = { create: vi.fn() };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: '' }),
    });
    server.close();
    expect(res.status).toBe(422);
  });

  it('PATCH /comments/:id — updates own comment', async () => {
    const token = await makeToken('user-1');
    const updated = { ...sampleComment, body: 'Updated body' };
    const service = { update: vi.fn().mockResolvedValue(updated) };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/comments/comment-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: 'Updated body' }),
    });
    const json = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(json.data.body).toBe('Updated body');
    expect(service.update).toHaveBeenCalledWith('comment-1', 'user-1', 'Updated body');
  });

  it('PATCH /comments/:id — returns 403 when not owner', async () => {
    const token = await makeToken('user-2');
    const service = {
      update: vi.fn().mockRejectedValue(new AppError('Forbidden', 403, 'forbidden')),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/comments/comment-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: 'Hacked' }),
    });
    server.close();
    expect(res.status).toBe(403);
  });

  it('DELETE /comments/:id — soft-deletes own comment', async () => {
    const token = await makeToken('user-1');
    const service = { delete: vi.fn().mockResolvedValue(undefined) };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/comments/comment-1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    server.close();

    expect(res.status).toBe(204);
    expect(service.delete).toHaveBeenCalledWith('comment-1', 'user-1');
  });

  it('DELETE /comments/:id — returns 401 without auth', async () => {
    const service = { delete: vi.fn() };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/comments/comment-1`, {
      method: 'DELETE',
    });
    server.close();
    expect(res.status).toBe(401);
  });
});
