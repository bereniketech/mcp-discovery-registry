import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

const MISSING_TOKEN = {
  error: { code: 'unauthorized', message: 'Missing authorization token', status: 401 },
};

const INVALID_TOKEN = {
  error: { code: 'unauthorized', message: 'Invalid authorization token', status: 401 },
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(MISSING_TOKEN);
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    next(new Error('SUPABASE_JWT_SECRET is not configured'));
    return;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    req.user = {
      id: payload.sub ?? '',
      email: String(payload['email'] ?? ''),
    };
    next();
  } catch {
    res.status(401).json(INVALID_TOKEN);
  }
}
