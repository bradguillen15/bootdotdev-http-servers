import type { Request, Response } from 'express';
import { Router } from 'express';
import { getUserById } from '../db/queries/users.js';
import { createChirp, getChirpById, getChirps } from '../db/queries/chirps.js';
import { BadRequestError, NotFoundError } from '../errors/httpErrors.js';
import { CHIRP_MAX_LENGTH } from '../constants/api.js';
import { PROFANITY_PATTERN } from '../constants/validation.js';
import { AuthLocals, requireAuth } from '../middleware/requireAuth.js';

type CreateChirpBody = {
  body: string;
};

export function createChirpRoutes(): Router {
  const router = Router();

  router.get('/chirps', async (_req, res) => {
    const chirpList = await getChirps();
    res.status(200).send(chirpList);
  });

  router.get('/chirps/:id', async (req, res) => {
    const id = req.params.id;

    if (!id) {
      throw new BadRequestError('Chirp ID is required');
    }

    const chirp = await getChirpById(id);

    if (!chirp) {
      throw new NotFoundError('Chirp not found');
    }

    res.status(200).send(chirp);
  });

  router.post(
    '/chirps',
    requireAuth,
    async (req: Request<unknown, unknown, CreateChirpBody>, res: Response<unknown, AuthLocals>) => {
      const body = req.body.body;
      const user = await getUserById(res.locals.userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!body) {
        throw new BadRequestError('Body is required');
      }

      if (body.length > CHIRP_MAX_LENGTH) {
        throw new BadRequestError(`Chirp is too long. Max length is ${CHIRP_MAX_LENGTH}`);
      }

      const cleanedBody = body.replace(PROFANITY_PATTERN, '****');
      const createdChirp = await createChirp({ userId: user.id, body: cleanedBody });

      res.status(201).send(createdChirp);
    },
  );

  return router;
}
