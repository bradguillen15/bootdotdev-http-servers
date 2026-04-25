import type { ErrorRequestHandler } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { HttpError } from '../errors/httpErrors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).send({ error: err.message });
    return;
  }

  const error = err instanceof Error ? err : new Error(String(err));
  console.error(JSON.stringify(error, null, 2));
  res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .send({ error: `Something went wrong on our end ${error.message}` });
};
