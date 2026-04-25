import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const assetsDir = path.join(__dirname, '..', '..', 'assets');

export function createStaticRoutes(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.sendFile(indexHtmlPath);
  });

  router.use('/assets', express.static(assetsDir));

  return router;
}
