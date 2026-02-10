import { ForbiddenException, Logger, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';
import express from 'express';

export const getCsrfHeaderName = (configService: ConfigService): string =>
  configService.get<string>('CSRF_HEADER_NAME') ?? 'x-csrf-token';

export const configureCsrfProtection = (
  app: INestApplication,
  configService: ConfigService,
  logger: Logger,
  isProduction: boolean,
  csrfHeaderName = getCsrfHeaderName(configService),
): void => {
  const csrfSecretCookieName =
    configService.get<string>('CSRF_SECRET_COOKIE_NAME') ?? '_csrf';
  const csrfTokenCookieName =
    configService.get<string>('CSRF_TOKEN_COOKIE_NAME') ?? 'XSRF-TOKEN';
  const csrfCookieSameSite =
    configService.get<'strict' | 'lax' | 'none'>('CSRF_COOKIE_SAMESITE') ??
    'lax';
  const csrfTokenTtlSeconds =
    configService.get<number>('CSRF_TOKEN_TTL_SECONDS') ?? 60 * 60;
  const csrfCookieSecure = csrfCookieSameSite === 'none' ? true : isProduction;

  if (
    csrfCookieSameSite === 'none' &&
    !isProduction &&
    process.env.NODE_ENV !== 'test'
  ) {
    logger.warn(
      'CSRF_COOKIE_SAMESITE=none requires HTTPS; ensure secure proxy configuration in non-production environments.',
    );
  }

  const {
    doubleCsrfProtection,
    generateCsrfToken, // This is the function to generate a token
  } = doubleCsrf({
    getSecret: () =>
      configService.get<string>('CSRF_SECRET') ??
      'complex-secret-key-must-be-changed-in-production', // Key used to sign the token
    getSessionIdentifier: () => 'api', // Required by type, but not used for stateless double submit
    cookieName: csrfSecretCookieName,
    cookieOptions: {
      httpOnly: true,
      sameSite: csrfCookieSameSite,
      secure: csrfCookieSecure,
      maxAge: csrfTokenTtlSeconds * 1000,
      path: '/',
    },
    size: 64, // The size of the generated tokens in bits
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });

  // Apply the CSRF protection middleware
  app.use(doubleCsrfProtection);

  // Middleware to generate and set the token for safe methods
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        try {
          const token = generateCsrfToken(req, res);
          res.cookie(csrfTokenCookieName, token, {
            sameSite: csrfCookieSameSite,
            secure: csrfCookieSecure,
            httpOnly: false, // Allow frontend to read this cookie
            maxAge: csrfTokenTtlSeconds * 1000,
            path: '/',
          });

          res.setHeader(csrfHeaderName, token);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn(
            `Failed to issue CSRF token for ${req.method} ${req.originalUrl}: ${errorMessage}`,
          );
        }
      }
      next();
    },
  );

  // Error handling middleware
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err === 'invalid csrf token') {
        return next(new ForbiddenException('Invalid CSRF token'));
      }

      if (
        (typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'EBADCSRFTOKEN') ||
        (err instanceof Error && err.message === 'invalid csrf token')
      ) {
        return next(new ForbiddenException('Invalid CSRF token'));
      }
      next(err);
    },
  );
};
