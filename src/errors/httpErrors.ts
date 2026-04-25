import { HTTP_STATUS } from '../constants/httpStatus.js';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(HTTP_STATUS.BAD_REQUEST, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(HTTP_STATUS.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(HTTP_STATUS.FORBIDDEN, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(HTTP_STATUS.NOT_FOUND, message);
  }
}
