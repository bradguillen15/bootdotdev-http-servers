import express from 'express';
import { middlewareLogResponses } from './middleware/logResponses.js';
import { middlewareMetricsInc } from './middleware/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createStaticRoutes } from './routes/staticRoutes.js';
import { createAdminRoutes } from './routes/adminRoutes.js';
import { createChirpRoutes } from './routes/chirpRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createUserRoutes } from './routes/userRoutes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(middlewareLogResponses);
  app.use(express.json());
  app.use('/app', middlewareMetricsInc);

  app.use('/app', createStaticRoutes());
  app.use('/admin', createAdminRoutes());
  app.use('/api', createChirpRoutes());
  app.use('/api', createAuthRoutes());
  app.use('/api', createUserRoutes());
  app.use(errorHandler);

  return app;
}
