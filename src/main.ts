import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EnvVariables } from './config/env.validation';
import { configureApplication, configureSwagger } from './bootstrap/setup-app';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get<ConfigService<EnvVariables>>(ConfigService);

  const nodeEnv =
    configService.get('NODE_ENV', { infer: true }) ?? 'development';

  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  const redisService = app.get(RedisService);
  configureApplication({
    app,
    configService,
    redisService,
    logger,
    isProduction,
  });

  const port = configService.getOrThrow('PORT', { infer: true });
  configureSwagger({ app, logger, isProduction, port });
  await app.listen(port);
}
void bootstrap();
