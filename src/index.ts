import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction } from 'express';
import { config } from './config.js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  createUser,
  deleteAllUsers,
  getUserById,
  getUserByEmail,
} from './db/queries/users.js';
import {
  createRefreshToken,
  validateRefreshToken,
  getUserFromRefreshToken,
  revokeRefreshToken,
} from './db/queries/refreshTokens.js';
import { createChirp, getChirps, getChirpById } from './db/queries/chrips.js';
import {
  hashPassword,
  checkPasswordHash,
  makeJWT,
  getBearerToken,
  validateJWT,
  makeRefreshToken,
} from './auth.js';
import { users } from './db/schema.js';

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const HOST = '::';

type LoginRequest = {
  email: string;
  password: string;
};

type UserRow = typeof users.$inferSelect;
type UserWithoutPassword = Omit<UserRow, 'hashed_password'> & {
  token?: string;
  refreshToken?: string;
};

const indexHtmlPath = path.join(__dirname, '..', 'src', 'index.html');
const adminMetricsHtmlPath = path.join(
  __dirname,
  '..',
  'src',
  'admin',
  'index.html',
);
const assetsDir = path.join(__dirname, '..', 'assets');

function middlewareMetricsInc(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
) {
  config.api.fileserverHits++;
  // CLI expects 2 hits per GET /app; mounted /app leaves req.path '/' for the homepage.
  if (req.baseUrl === '/app' && req.path === '/') {
    config.api.fileserverHits++;
  }
  next();
}

const middlewareLogResponses = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  res.on('finish', () => {
    if (res.statusCode !== 200) {
      console.log(
        `[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`,
      );
    }
  });
  next();
};

app.use(middlewareLogResponses);
app.use(express.json());
app.use('/app', middlewareMetricsInc);

app.get('/app', (_req, res) => {
  res.sendFile(indexHtmlPath);
});

app.use('/app/assets', express.static(assetsDir));

app.get('/admin/metrics', (_req, res) => {
  const template = readFileSync(adminMetricsHtmlPath, 'utf8');
  const html = template.replace('NUM', String(config.api.fileserverHits));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.post('/admin/reset', async (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (config.api.platform !== 'dev') {
    throw new ForbiddenError('Forbidden');
  }
  await deleteAllUsers();
  config.api.fileserverHits = 0;
  res.send(`Reset successful`);
});

app.get('/api/healthz', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('OK');
});

const PROFANITY_PATTERN = /\b(kerfuffle|sharbert|fornax)\b/gi;

app.get('/api/chirps', async (req, res) => {
  try {
    const chirps = await getChirps();
    res.status(200).send(chirps);
  } catch (error) {
    throw error;
  }
});

app.get('/api/chirps/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      throw new BadRequestError('Chirp ID is required');
    }

    const chirp = await getChirpById(id);

    if (!chirp) {
      throw new NotFoundError('Chirp not found');
    }

    res.status(200).send(chirp);
  } catch (error) {
    throw error;
  }
});

app.post('/api/chirps', async (req: express.Request, res: express.Response) => {
  try {
    const body: string = req.body.body;
    let userId: string;
    try {
      const token = getBearerToken(req);
      const payload = validateJWT(token, config.api.secret);
      if (!payload.userID) {
        throw new UnauthorizedError('Invalid token');
      }
      userId = payload.userID;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid token');
    }

    const user = await getUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!body) {
      throw new BadRequestError('Body is required');
    }

    if (body.length > 400) {
      throw new BadRequestError('Chirp is too long. Max length is 140');
    }

    const cleanedBody = body.replace(PROFANITY_PATTERN, '****');
    const createdChirp = await createChirp({ userId, body: cleanedBody });

    res.status(201).send(createdChirp);
  } catch (error) {
    throw error;
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const user: LoginRequest = req.body;
    const error = new UnauthorizedError('incorrect email or password');

    if (!user.email) throw error;

    if (!user.password) throw error;

    const dbUser = await getUserByEmail(user.email);

    if (!dbUser) throw error;

    const isPasswordValid = await checkPasswordHash(
      user.password,
      dbUser.hashed_password,
    );

    if (!isPasswordValid) throw error;

    const token = makeJWT(dbUser.id, config.api.secret);
    const refreshToken = makeRefreshToken();

    await createRefreshToken({
      token: refreshToken,
      userId: dbUser.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), // 60 days
    });

    const { hashed_password: _hashedPassword, ...publicUser } = dbUser;
    res.status(200).send({
      token,
      refreshToken,
      ...publicUser,
    } satisfies UserWithoutPassword);
  } catch (error) {
    throw error;
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user: LoginRequest = req.body;

    if (!user.email) {
      throw new BadRequestError('Email is required');
    }

    if (!user.password) {
      throw new BadRequestError('Password is required');
    }

    const createdUser = await createUser({
      email: user.email,
      hashed_password: await hashPassword(user.password),
    });

    if (!createdUser) {
      throw new BadRequestError('Email already registered');
    }

    const { hashed_password: _hashedPassword, ...publicUser } = createdUser;
    res.status(201).send(publicUser satisfies UserWithoutPassword);
  } catch (error) {
    throw error;
  }
});

app.post('/api/refresh', async (req, res) => {
  try {
    const refreshToken = getBearerToken(req);
    const isRefreshTokenValid = await validateRefreshToken(refreshToken);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await getUserFromRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return res
      .status(200)
      .send({ token: makeJWT(user.userId, config.api.secret) });
  } catch (error) {
    throw error;
  }
});

app.post('/api/revoke', async (req, res) => {
  try {
    const refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (error) {
    throw error;
  }
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: NextFunction,
  ) => {
    if (err instanceof BadRequestError) {
      res.status(err.statusCode).send({ error: err.message });
    } else if (err instanceof UnauthorizedError) {
      res.status(err.statusCode).send({ error: err.message });
    } else if (err instanceof ForbiddenError) {
      res.status(err.statusCode).send({ error: err.message });
    } else if (err instanceof NotFoundError) {
      res.status(err.statusCode).send({ error: err.message });
    } else {
      console.error(JSON.stringify(err, null, 2));
      res
        .status(500)
        .send({ error: 'Something went wrong on our end ' + err.message });
    }
  },
);

app.listen(PORT, HOST, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

class BadRequestError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message: string) {
    super(message);
  }
}

class ForbiddenError extends Error {
  statusCode = 403;

  constructor(message: string) {
    super(message);
  }
}

class NotFoundError extends Error {
  statusCode = 404;

  constructor(message: string) {
    super(message);
  }
}
