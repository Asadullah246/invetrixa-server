import { Inject, Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import type { Options } from 'argon2';

/**
 * Injection token for Argon2 password hashing options
 */
export const ARGON_OPTIONS = 'ARGON_OPTIONS';

/**
 * Helper service for password hashing and verification using Argon2
 *
 * @example
 * ```
 * constructor(private readonly argonHelper: ArgonHelper) {}
 *
 * async hashUserPassword(password: string) {
 *   return this.argonHelper.hashPassword(password);
 * }
 *
 * async verifyUserPassword(password: string, hash: string) {
 *   return this.argonHelper.verifyPassword(password, hash);
 * }
 * ```
 */
@Injectable()
export class ArgonHelper {
  constructor(
    @Inject(ARGON_OPTIONS)
    private readonly hashingOptions: Options & { readonly type: number } = {
      type: argon.argon2id,
    },
  ) {}

  /**
   * Hashes a password using Argon2
   *
   * @param password - The plain text password to hash
   * @returns A promise that resolves to the hashed password
   *
   * @example
   * ```
   * const hashedPassword = await argonHelper.hashPassword('mySecurePassword123');
   * Returns: '$argon2id$v=19$m=65536,t=3,p=1$...'
   * ```
   */
  hashPassword(password: string) {
    return argon.hash(password, this.hashingOptions);
  }

  /**
   * Verifies a password against a hash
   *
   * @param password - The plain text password to verify
   * @param hashedPassword - The hashed password to compare against
   * @returns A promise that resolves to true if the password matches, false otherwise
   *
   * @example
   * ```
   * const isValid = await argonHelper.verifyPassword(
   *   'mySecurePassword123',
   *   '$argon2id$v=19$m=65536,t=3,p=1$...'
   * );
   * Returns: true or false
   * ```
   */
  verifyPassword(password: string, hashedPassword: string) {
    return argon.verify(hashedPassword, password, this.hashingOptions);
  }
}
