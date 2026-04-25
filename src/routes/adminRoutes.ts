import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { config } from '../config.js';
import { deleteAllUsers } from '../db/queries/users.js';
import { ForbiddenError } from '../errors/httpErrors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminMetricsHtmlPath = path.join(__dirname, '..', 'admin', 'index.html');

export function createAdminRoutes(): Router {
  const router = Router();

  router.get('/metrics', (_req, res) => {
    const template = readFileSync(adminMetricsHtmlPath, 'utf8');
    const html = template.replace('NUM', String(config.api.fileserverHits));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  router.post('/reset', async (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (config.api.platform !== 'dev') {
      throw new ForbiddenError('Forbidden');
    }

    await deleteAllUsers();
    config.api.fileserverHits = 0;
    res.send('Reset successful');
  });

  return router;
}
