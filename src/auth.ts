import argon2 from 'argon2';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';
import { UnauthorizedError } from './errors/httpErrors.js';

const DEFAULT_JWT_EXPIRES_SECONDS = 60 * 60;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function checkPasswordHash(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return argon2.verify(hashedPassword, password);
}

export function makeJWT(userId: string, secret: string): string {
  return jwt.sign({ userId }, secret, {
    expiresIn: DEFAULT_JWT_EXPIRES_SECONDS,
  });
}

type JwtUserPayload = Pick<JwtPayload, 'iss' | 'sub' | 'iat' | 'exp'> & {
  userId?: string;
};

export function validateJWT(token: string, secret: string): JwtUserPayload {
  return jwt.verify(token, secret) as JwtUserPayload;
}

export function getBearerToken(req: Request): string {
  const authorization = req.get('authorization');

  if (!authorization) {
    throw new UnauthorizedError('Authorization header is required');
  }

  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer') {
    throw new UnauthorizedError('Authorization header must be a Bearer token');
  }

  return token;
}

export function makeRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getAPIKey(req: Request): string {
  const authorization = req.get('Authorization');

  if (!authorization) {
    throw new UnauthorizedError('Authorization header is required');
  }

  const [type, token] = authorization.split(' ');

  if (type !== 'ApiKey') {
    throw new UnauthorizedError('Authorization header must be a ApiKey token');
  }

  return token;
}
