import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      res.status(422).json({
        error: { code: 'validation_error', message: 'Request validation failed', details, status: 422 },
      });
      return;
    }

    req.body = result.data as unknown;
    next();
  };
}
