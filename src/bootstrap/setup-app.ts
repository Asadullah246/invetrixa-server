import {
  INestApplication,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
import express from 'express';
import passport from 'passport';
// import { configureCsrfProtection, getCsrfHeaderName } from './csrf.config';

import {
  configureCsrfProtection,
  getCsrfHeaderName,
} from './csrf-protection.config';
import { configureHelmet } from './helmet.config';
import { configureSession } from './session.config';
import { RequestIdMiddleware } from '../common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from '../common/middleware/request-logger.middleware';
import { SecurityMiddleware } from '../common/middleware/security.middleware';
import { RedisService } from '../redis/redis.service';
import { InternalServerErrorResponse } from '@/common/dto/api-responses/responses/500';

type ConfigureApplicationOptions = {
  app: INestApplication;
  configService: ConfigService;
  redisService: RedisService;
  logger: Logger;
  isProduction: boolean;
};

type ConfigureSwaggerOptions = {
  app: INestApplication;
  logger: Logger;
  isProduction: boolean;
  port?: number | string;
};

const configureRequestTimeout = (
  app: INestApplication,
  timeoutMs: number,
): void => {
  if (timeoutMs <= 0) {
    return;
  }

  app.use(timeout(`${timeoutMs}ms`));
  app.use(
    (
      req: express.Request & { timedout?: boolean },
      _res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!req.timedout) {
        next();
      }
    },
  );
};

const configureCoreMiddleware = (app: INestApplication): void => {
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};

const configureCors = (
  app: INestApplication,
  configService: ConfigService,
  isProduction: boolean,
  csrfHeaderName: string,
): void => {
  const allowedHeaders = new Set([
    'Content-Type',
    'Authorization',
    'Accept',
    'Accept-Language',
    'X-Requested-With',
    'X-Request-ID',
    'x-location-id',
    'x-tenant-id',
    csrfHeaderName,
  ]);

  const exposedHeaders = new Set([
    'Content-Type',
    'X-Request-ID',
    'x-tenant-id',
    csrfHeaderName,
  ]);

  app.enableCors({
    origin: isProduction
      ? [configService.getOrThrow<string>('FRONTEND_URL')]
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: Array.from(allowedHeaders),
    exposedHeaders: Array.from(exposedHeaders),
  });
};

const configureValidation = (
  app: INestApplication,
  isProduction: boolean,
): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      disableErrorMessages: isProduction,
    }),
  );
};

const registerCustomMiddleware = (app: INestApplication): void => {
  const securityMiddleware = new SecurityMiddleware();
  app.use(securityMiddleware.use.bind(securityMiddleware));

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  const requestLogger = new RequestLoggerMiddleware();
  app.use(requestLogger.use.bind(requestLogger));
};

const configurePassportSupport = (app: INestApplication): void => {
  app.use(passport.initialize());
  app.use(passport.session());
};

const configureGlobalPrefix = (app: INestApplication): void => {
  app.setGlobalPrefix('api', { exclude: ['/health'] });
};

const configureVersioning = (app: INestApplication): void => {
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });
};

const configureLogger = (app: INestApplication): void => {
  app.useLogger(new Logger());
};

export const configureApplication = ({
  app,
  configService,
  redisService,
  logger,
  isProduction,
}: ConfigureApplicationOptions): void => {
  const requestTimeoutMs = configService.get<number>('REQUEST_TIMEOUT_MS') ?? 0;
  configureRequestTimeout(app, requestTimeoutMs);

  configureCoreMiddleware(app);
  configureHelmet(app, isProduction);

  const csrfHeaderName = getCsrfHeaderName(configService);
  configureCors(app, configService, isProduction, csrfHeaderName);

  configureValidation(app, isProduction);

  configureSession(app, configService, redisService, logger, isProduction);

  // configureCsrfProtection(app, configService, logger, true, csrfHeaderName);

  if (isProduction) {
    configureCsrfProtection(app, configService, logger, true, csrfHeaderName);
  } else {
    logger.warn('CSRF protection disabled for local development');
  }

  registerCustomMiddleware(app);
  configurePassportSupport(app);
  configureGlobalPrefix(app);
  configureVersioning(app);
  configureLogger(app);
};

export const configureSwagger = ({
  app,
  // logger,
  isProduction,
  port,
}: ConfigureSwaggerOptions): void => {
  if (isProduction) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Invetrixa Saas application API')
    .setDescription('API documentation for Invetrixa Saas application')
    .setVersion('1.0')
    .addServer(`http://localhost:${port}/api`, 'Development server')
    .addCookieAuth('connect.sid', {
      type: 'apiKey',
      in: 'cookie',
      name: 'connect.sid',
      description: 'Session cookie for authentication',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-tenant-id',
        description:
          'Tenant ID for multi-tenant operations (required for all tenant-specific endpoints)',
      },
      'x-tenant-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-location-id',
        description: 'Location ID for location-specific operations',
      },
      'x-location-id',
    )
    .addSecurityRequirements('x-tenant-id')
    .addSecurityRequirements('x-location-id')
    .addGlobalResponse({
      status: 500,
      description: 'Internal Server Error',
      type: InternalServerErrorResponse,
    })
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Persist auth across page reloads
      withCredentials: true, // Enable cookies
    },
  });
  // logger.log('Swagger documentation available at /api-docs');
};
