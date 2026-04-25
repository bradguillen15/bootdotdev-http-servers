import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../index.js';
import { NewRefreshToken, refreshTokens } from '../schema.js';

export async function createRefreshToken(refreshToken: NewRefreshToken) {
  const [result] = await db
    .insert(refreshTokens)
    .values(refreshToken)
    .returning();
  return result;
}

export async function validateRefreshToken(refreshToken: string) {
  const result = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, refreshToken),
        gt(refreshTokens.expiresAt, new Date()),
        isNull(refreshTokens.revokedAt),
      ),
    );
  return result.length > 0;
}

export async function getUserFromRefreshToken(refreshToken: string) {
  const [result] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));
  return result;
}

export async function revokeRefreshToken(refreshToken: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, refreshToken));
}
