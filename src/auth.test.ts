import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import {
  hashPassword,
  checkPasswordHash,
  getBearerToken,
  makeJWT,
  validateJWT,
} from './auth.js';

function requestWithAuthorization(value: string | undefined): Request {
  const req = {
    get: (header: string): string | undefined => {
      if (header.toLowerCase() !== 'authorization') {
        return undefined;
      }
      return value;
    },
  };
  return req as Request;
}

describe('hashPassword', () => {
  it('returns an argon2-encoded string', async () => {
    const hash = await hashPassword('any-password');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash.length).toBeGreaterThan(20);
  });

  it('uses a random salt so two hashes of the same password differ', async () => {
    const password = 'same-password-twice';
    const a = await hashPassword(password);
    const b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(await checkPasswordHash(password, a)).toBe(true);
    expect(await checkPasswordHash(password, b)).toBe(true);
  });
});

describe('checkPasswordHash', () => {
  const password = 'correctPassword123!';
  let hash: string;

  beforeAll(async () => {
    hash = await hashPassword(password);
  });

  it('returns true when password matches the hash', async () => {
    await expect(checkPasswordHash(password, hash)).resolves.toBe(true);
  });

  it('returns false when password does not match', async () => {
    await expect(checkPasswordHash('wrong-password', hash)).resolves.toBe(
      false,
    );
  });

  it('returns false when verifying against a hash produced from a different password', async () => {
    const otherHash = await hashPassword('other-secret');
    await expect(checkPasswordHash(password, otherHash)).resolves.toBe(false);
  });
});

describe('makeJWT', () => {
  const secret = 'makejwt-test-secret';
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  it('returns a compact JWT string (header.payload.signature)', () => {
    const token = makeJWT(userId, secret);
    expect(token.split('.')).toHaveLength(3);
    expect(token.length).toBeGreaterThan(20);
  });

  it('embeds userId in the payload', () => {
    const token = makeJWT(userId, secret);
    const decoded = jwt.decode(token) as jwt.JwtPayload & { userId?: string };
    expect(decoded.userId).toBe(userId);
  });

  it('sets exp to exactly 1 hour after iat', () => {
    const token = makeJWT(userId, secret);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBe(decoded.iat! + 60 * 60);
  });

  it('produces a token that validateJWT accepts with the same secret', () => {
    const token = makeJWT(userId, secret);
    const payload = validateJWT(token, secret);
    const withUser = payload as jwt.JwtPayload & { userId?: string };
    expect(withUser.userId).toBe(userId);
  });
});

describe('getBearerToken', () => {
  const jwtSample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig';

  it('returns the token when Authorization is a Bearer token', () => {
    const req = requestWithAuthorization(`Bearer ${jwtSample}`);
    expect(getBearerToken(req)).toBe(jwtSample);
  });

  it('throws when the Authorization header is missing', () => {
    const req = requestWithAuthorization(undefined);
    expect(() => getBearerToken(req)).toThrow(
      'Authorization header is required',
    );
  });

  it('throws when the scheme is not Bearer', () => {
    const req = requestWithAuthorization(`Basic ${btoa('user:pass')}`);
    expect(() => getBearerToken(req)).toThrow(
      'Authorization header must be a Bearer token',
    );
  });

  it('rejects lowercase bearer (scheme must be exactly Bearer)', () => {
    const req = requestWithAuthorization(`bearer ${jwtSample}`);
    expect(() => getBearerToken(req)).toThrow(
      'Authorization header must be a Bearer token',
    );
  });
});

describe('validateJWT', () => {
  const secret = 'test-secret-for-jwt';
  const otherSecret = 'different-secret';
  const userId = 'user-uuid-123';

  it('returns a verified payload for a valid token', () => {
    const token = makeJWT(userId, secret);
    const payload = validateJWT(token, secret);
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat!);
    const withUser = payload as jwt.JwtPayload & { userId?: string };
    expect(withUser.userId).toBe(userId);
  });

  it('rejects a token signed with a different secret', () => {
    const token = makeJWT(userId, secret);
    expect(() => validateJWT(token, otherSecret)).toThrow();
  });

  it('rejects a malformed token string', () => {
    expect(() => validateJWT('not.a.jwt', secret)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ userId }, secret, { expiresIn: -1 });
    expect(() => validateJWT(token, secret)).toThrow();
  });
});
