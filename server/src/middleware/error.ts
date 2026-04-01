import type { ErrorRequestHandler } from 'express';

interface AppError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req,
  res,
  next,
): void => {
  void next;
  const status = err.status ?? 500;
  const code = err.code ?? 'internal_error';
  const message = status === 500 ? 'An unexpected error occurred' : err.message;

  res.status(status).json({ error: { code, message, status } });
};
