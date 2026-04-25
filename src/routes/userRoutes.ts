import { Router } from 'express';
import { createUser, updateUserById } from '../db/queries/users.js';
import { hashPassword } from '../auth.js';
import { BadRequestError } from '../errors/httpErrors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { users } from '../db/schema.js';

type CredentialsInput = {
  email: string;
  password: string;
};

type UserRow = typeof users.$inferSelect;
type UserWithoutPassword = Omit<UserRow, 'hashed_password'>;

export function createUserRoutes(): Router {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('OK');
  });

  router.post('/users', async (req, res) => {
    const user: CredentialsInput = req.body;

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
  });

  router.put('/users', requireAuth, async (req, res) => {
    const userId = res.locals.userId;
    const user: CredentialsInput = req.body;

    if (!user.email) {
      throw new BadRequestError('Email is required');
    }

    if (!user.password) {
      throw new BadRequestError('Password is required');
    }

    const updatedUser = await updateUserById(userId, {
      email: user.email,
      hashed_password: await hashPassword(user.password),
    });

    if (!updatedUser) {
      throw new BadRequestError('User not found');
    }

    const { hashed_password: _hashedPassword, ...publicUser } = updatedUser;
    res.status(200).send(publicUser satisfies UserWithoutPassword);
  });

  return router;
}
