import { argon2id } from 'argon2';

export const PASSWORD_HASHING_OPTIONS = {
  type: argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;
