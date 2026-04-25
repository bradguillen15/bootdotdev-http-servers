import { Router } from 'express';
import { config } from '../config.js';
import {
  createRefreshToken,
  getUserFromRefreshToken,
  revokeRefreshToken,
  validateRefreshToken,
} from '../db/queries/refreshTokens.js';
import { getUserByEmail } from '../db/queries/users.js';
import {
  checkPasswordHash,
  getBearerToken,
  makeJWT,
  makeRefreshToken,
} from '../auth.js';
import { UnauthorizedError } from '../errors/httpErrors.js';
import { users } from '../db/schema.js';
import { REFRESH_TOKEN_TTL_MS } from '../constants/api.js';

type CredentialsInput = {
  email: string;
  password: string;
};

type UserRow = typeof users.$inferSelect;
type UserWithoutPassword = Omit<UserRow, 'hashed_password'> & {
  token?: string;
  refreshToken?: string;
};

export function createAuthRoutes(): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const user: CredentialsInput = req.body;
    const error = new UnauthorizedError('incorrect email or password');

    if (!user.email || !user.password) {
      throw error;
    }

    const dbUser = await getUserByEmail(user.email);

    if (!dbUser) {
      throw error;
    }

    const isPasswordValid = await checkPasswordHash(
      user.password,
      dbUser.hashed_password,
    );

    if (!isPasswordValid) {
      throw error;
    }

    const token = makeJWT(dbUser.id, config.api.secret);
    const refreshToken = makeRefreshToken();

    await createRefreshToken({
      token: refreshToken,
      userId: dbUser.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    const { hashed_password: _hashedPassword, ...publicUser } = dbUser;
    res.status(200).send({
      token,
      refreshToken,
      ...publicUser,
    } satisfies UserWithoutPassword);
  });

  router.post('/refresh', async (req, res) => {
    const refreshToken = getBearerToken(req);
    const isRefreshTokenValid = await validateRefreshToken(refreshToken);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await getUserFromRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    res.status(200).send({ token: makeJWT(user.userId, config.api.secret) });
  });

  router.post('/revoke', async (req, res) => {
    const refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  });

  return router;
}
