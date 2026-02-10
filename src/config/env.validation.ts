import { z } from 'zod';

const booleanFromEnv = z
  .preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true') {
        return true;
      }
      if (value === 'false') {
        return false;
      }
    }

    return value;
  }, z.boolean())
  .default(false);

export const envValidationSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    FRONTEND_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32).optional(),
    SESSION_SECRETS: z.string().optional(),
    SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .default(60 * 60 * 24 * 7),
    SESSION_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    CSRF_SECRET_COOKIE_NAME: z.string().min(1).default('_csrf'),
    CSRF_TOKEN_COOKIE_NAME: z.string().min(1).default('XSRF-TOKEN'),
    CSRF_HEADER_NAME: z.string().min(1).default('x-csrf-token'),
    CSRF_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    CSRF_SECRET: z.string().min(1).optional(),
    CSRF_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .default(60 * 60), // 1 hour
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().int().min(0).default(0),
    REDIS_TLS: booleanFromEnv,
    THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),
    THROTTLE_LIMIT: z.coerce.number().int().min(1).default(100),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),

    EMAIL_SERVICE: z.string(),
    EMAIL_USERNAME: z.string(),
    EMAIL_PASSWORD: z.string(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'FRONTEND_URL is required when NODE_ENV is production',
        path: ['FRONTEND_URL'],
      });
    }

    if (!env.SESSION_SECRET && !env.SESSION_SECRETS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either SESSION_SECRET or SESSION_SECRETS must be provided',
        path: ['SESSION_SECRET'],
      });
    }

    const hasRedisUrl = Boolean(env.REDIS_URL);
    const hasRedisHost = Boolean(env.REDIS_HOST);

    if (hasRedisUrl === hasRedisHost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either REDIS_URL or REDIS_HOST',
        path: hasRedisUrl ? ['REDIS_HOST'] : ['REDIS_URL'],
      });
    }
  });

export type EnvVariables = z.infer<typeof envValidationSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvVariables => {
  const result = envValidationSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) =>
          `${issue.path.length > 0 ? issue.path.join('.') : 'root'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(`Environment validation error:\n${details}`);
  }

  return result.data;
};
