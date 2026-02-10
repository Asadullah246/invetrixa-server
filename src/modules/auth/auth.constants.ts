import { argon2id } from 'argon2';

export const PASSWORD_HASHING_OPTIONS = {
  type: argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export const MFA_REMEMBER_DEVICE_COOKIE = 'mfaDeviceId';
export const MFA_REMEMBER_DEVICE_DAYS = 30;
export const MFA_BACKUP_CODES_COUNT = 10;
export const MFA_BACKUP_CODE_LENGTH = 12;
export const MFA_OOB_CODE_LENGTH = 6;
export const MFA_OOB_CODE_TTL_MINUTES = 10;
export const MFA_MAX_ATTEMPTS = 5;

export const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 60 * 24;
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

export const SESSION_LIST_DEFAULT_PAGE_SIZE = 10;
export const SESSION_LIST_MAX_PAGE_SIZE = 50;
