import * as argon2 from 'argon2';

/**
 * Hash a password using argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}
