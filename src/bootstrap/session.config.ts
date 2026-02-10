import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { RedisStore } from 'connect-redis';
import session from 'express-session';

import { RedisService } from '../redis/redis.service';

export const configureSession = (
  app: INestApplication,
  configService: ConfigService,
  redisService: RedisService,
  logger: Logger,
  isProduction: boolean,
): void => {
  const redisClient = redisService.getClient();
  const sessionSecretsEnv =
    configService.get<string>('SESSION_SECRETS') ?? null;
  const sessionSecretValues = sessionSecretsEnv
    ?.split(',')
    .map((secret) => secret.trim())
    .filter((secret) => secret.length > 0);
  const fallbackSessionSecret =
    configService.getOrThrow<string>('SESSION_SECRET');
  const sessionSecrets =
    sessionSecretValues && sessionSecretValues.length > 0
      ? sessionSecretValues
      : [fallbackSessionSecret];

  if (isProduction && sessionSecrets.some((secret) => secret.length < 32)) {
    logger.warn(
      'SESSION_SECRET values should be at least 32 characters long for production use',
    );
  }

  const sessionTtlSeconds =
    configService.get<number>('SESSION_TTL_SECONDS') ?? 60 * 60 * 24 * 7;
  const sessionCookieSameSite =
    configService.get<'strict' | 'lax' | 'none'>('SESSION_COOKIE_SAMESITE') ??
    'lax';
  const sessionCookieSecure =
    sessionCookieSameSite === 'none' ? true : isProduction;

  if (
    sessionCookieSameSite === 'none' &&
    !isProduction &&
    process.env.NODE_ENV !== 'test'
  ) {
    logger.warn(
      'SESSION_COOKIE_SAMESITE=none requires HTTPS; ensure secure proxy configuration in non-production environments.',
    );
  }

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'auth:',
        ttl: sessionTtlSeconds,
      }),
      secret: sessionSecrets,
      name: 'sessionId',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: sessionCookieSecure,
        httpOnly: true,
        maxAge: sessionTtlSeconds * 1000,
        sameSite: sessionCookieSameSite,
        path: '/',
      },
    }),
  );
};
