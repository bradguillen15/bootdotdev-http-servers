import { Router } from 'express';
import { config } from '../config.js';
import { getAPIKey } from '../auth.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { getUserById } from '../db/queries/users.js';
import { updateUserIsChirpyRed } from '../db/queries/users.js';

type PolkaWebhookBody = {
  event: 'user.upgraded';
  data: {
    userId: string;
  };
};

export function createWebhookRoutes(): Router {
  const router = Router();

  router.post('/polka/webhooks', async (req, res) => {
    const { event, data } = req.body as PolkaWebhookBody;
    const apiKey = getAPIKey(req);

    if (apiKey !== config.api.polkaKey) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .send({ error: 'Invalid API key' });
    }

    if (event !== 'user.upgraded') {
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    }

    const user = await getUserById(data.userId);

    if (!user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .send({ error: 'User not found' });
    }

    await updateUserIsChirpyRed(user.id, true);

    return res.status(HTTP_STATUS.NO_CONTENT).send();
  });

  return router;
}
