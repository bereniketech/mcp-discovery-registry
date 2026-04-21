import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { SignJWT } from 'jose';
import { createOwnershipRouter } from './ownership.js';
import { errorHandler } from '../middleware/error.js';
import { AppError } from '../utils/app-error.js';
import type { OwnershipService } from '../services/ownership.js';

const JWT_SECRET = 'test-secret';

async function makeToken(userId: string): Promise<string> {
  return new SignJWT({ email: 'test@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

function buildApp(ownershipService: Partial<OwnershipService>) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/servers', createOwnershipRouter(ownershipService as OwnershipService));
  app.use(errorHandler);
  return app;
}

describe('ownership routes', () => {
  let originalJwtSecret: string | undefined;

  beforeAll(() => {
    originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
  });

  it('POST /:id/claim/init — returns 401 without auth', async () => {
    const service = { initClaim: vi.fn() };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/claim/init`, {
      method: 'POST',
    });
    server.close();
    expect(res.status).toBe(401);
  });

  it('POST /:id/claim/init — returns token and instructions', async () => {
    const token = await makeToken('user-1');
    const service = {
      initClaim: vi.fn().mockResolvedValue({
        token: 'abc123',
        instructions: 'Add topic mcp-claim-abc123',
      }),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/claim/init`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    server.close();

    expect(res.status).toBe(201);
    expect(json.data.token).toBe('abc123');
    expect(service.initClaim).toHaveBeenCalledWith('server-1', 'user-1');
  });

  it('POST /:id/claim/verify — returns claimed: true on success', async () => {
    const token = await makeToken('user-1');
    const service = {
      verifyClaim: vi.fn().mockResolvedValue({ claimed: true }),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/claim/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(json.data.claimed).toBe(true);
  });

  it('POST /:id/claim/verify — returns 400 when token not found', async () => {
    const token = await makeToken('user-1');
    const service = {
      verifyClaim: vi.fn().mockRejectedValue(
        new AppError('Verification token not found', 400, 'claim_verification_failed'),
      ),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1/claim/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    server.close();
    expect(res.status).toBe(400);
  });

  it('PATCH /:id — allows owner to edit listing', async () => {
    const token = await makeToken('user-1');
    const updatedServer = { id: 'server-1', name: 'New Name', description: 'New desc' };
    const service = {
      updateListing: vi.fn().mockResolvedValue(updatedServer),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'New Name', description: 'New desc' }),
    });
    const json = await res.json();
    server.close();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('New Name');
    expect(service.updateListing).toHaveBeenCalledWith('server-1', 'user-1', {
      name: 'New Name',
      description: 'New desc',
    });
  });

  it('PATCH /:id — returns 403 for non-owner', async () => {
    const token = await makeToken('user-2');
    const service = {
      updateListing: vi.fn().mockRejectedValue(
        new AppError('Forbidden', 403, 'forbidden'),
      ),
    };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Hacked' }),
    });
    server.close();
    expect(res.status).toBe(403);
  });

  it('PATCH /:id — returns 401 without auth', async () => {
    const service = { updateListing: vi.fn() };
    const app = buildApp(service);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/servers/server-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    server.close();
    expect(res.status).toBe(401);
  });
});
