import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { UnauthorizedError } from '../errors/httpErrors.js';
import { getBearerToken, validateJWT } from '../auth.js';

export type AuthLocals = {
  userId: string;
};

export function requireAuth(
  req: Request,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): void {
  try {
    const token = getBearerToken(req);
    const payload = validateJWT(token, config.api.secret);

    if (!payload.userId) {
      throw new UnauthorizedError('Invalid token');
    }

    res.locals.userId = payload.userId;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    next(new UnauthorizedError('Invalid token'));
  }
}
