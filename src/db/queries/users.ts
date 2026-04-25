import { db } from '../index.js';
import { NewUser, users } from '../schema.js';
import { eq } from 'drizzle-orm';

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function updateUserById(id: string, user: NewUser) {
  const [result] = await db
    .update(users)
    .set(user)
    .where(eq(users.id, id))
    .returning();
  return result;
}

export async function getUserById(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result;
}

export async function getUserByEmail(email: string) {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result;
}

export async function deleteAllUsers(): Promise<void> {
  await db.delete(users);
}

export async function updateUserIsChirpyRed(id: string, isChirpyRed: boolean) {
  const [result] = await db
    .update(users)
    .set({ is_chirpy_red: isChirpyRed })
    .where(eq(users.id, id))
    .returning();
  return result;
}
