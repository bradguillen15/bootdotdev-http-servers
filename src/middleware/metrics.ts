import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

export function middlewareMetricsInc(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  config.api.fileserverHits++;
  // CLI expects 2 hits per GET /app; mounted /app leaves req.path '/' for the homepage.
  if (req.baseUrl === '/app' && req.path === '/') {
    config.api.fileserverHits++;
  }
  next();
}
