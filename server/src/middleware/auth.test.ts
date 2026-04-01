import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from './auth.js';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from 'jose';

function makeReqResNext(): [Request, Response, NextFunction] {
  const req = { headers: {} } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return [req, res, next];
}

describe('requireAuth middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, SUPABASE_JWT_SECRET: 'test-secret-32-chars-minimum!!' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 when Authorization header is missing', async () => {
    const [req, res, next] = makeReqResNext();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ status: 401 }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer scheme', async () => {
    const [req, res, next] = makeReqResNext();
    req.headers = { authorization: 'Basic dXNlcjpwYXNz' };

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const [req, res, next] = makeReqResNext();
    req.headers = { authorization: 'Bearer bad.token.here' };
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('JWTInvalid'));

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'unauthorized' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user when token is valid', async () => {
    const [req, res, next] = makeReqResNext();
    req.headers = { authorization: 'Bearer valid.jwt.token' };
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-123', email: 'alice@example.com' },
      protectedHeader: { alg: 'HS256' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-123', email: 'alice@example.com' });
    expect(res.status).not.toHaveBeenCalled();
  });
});
