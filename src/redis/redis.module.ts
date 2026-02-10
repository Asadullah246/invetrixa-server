import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

type RedisClient = ReturnType<typeof createClient>;

const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('RedisClient');
    const client = createRedisClient(configService, logger);
    try {
      await client.connect();
    } catch (error) {
      logger.error(
        'Unable to establish Redis connection',
        (error as Error).stack,
      );
      throw error;
    }
    return client;
  },
};

const createRedisClient = (
  configService: ConfigService,
  logger: Logger,
): RedisClient => {
  const redisUrl = configService.get<string>('REDIS_URL');
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT') ?? 6379;
  const passwordRaw = configService.get<string>('REDIS_PASSWORD');
  const password =
    passwordRaw && passwordRaw.trim().length > 0 ? passwordRaw : undefined;
  const db = configService.get<number>('REDIS_DB') ?? 0;
  const enableTls = configService.get<boolean>('REDIS_TLS') ?? false;

  // logger.log(
  //   `Connecting to Redis: ${redisUrl || `${host}:${port}`} (TLS: ${enableTls}, DB: ${db})`,
  // );

  const socketOptions = {
    connectTimeout: 10000,
    reconnectStrategy: (attempt: number) => Math.min(attempt * 250, 2000),
  };

  if (redisUrl) {
    const client = createClient({
      url: redisUrl,
      socket: socketOptions,
    });
    attachLogging(client, logger);
    return client;
  }

  if (!host) {
    throw new Error('REDIS_HOST must be defined when REDIS_URL is not set');
  }

  const url = enableTls
    ? `rediss://${password ? `${password}@` : ''}${host}:${port}/${db}`
    : `redis://${password ? `${password}@` : ''}${host}:${port}/${db}`;

  // logger.log(`Using Redis URL: ${url.replace(password || '', '***')}`);

  const client = createClient({
    url,
    socket: socketOptions,
  });

  attachLogging(client, logger);
  return client;
};

function attachLogging(client: RedisClient, logger: Logger) {
  client.on('ready', () => logger.log('Redis connection established'));
  client.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error(`Redis error: ${message}`, stack);
  });
  client.on('end', () => logger.warn('Redis connection closed'));
  client.on('reconnecting', () => logger.warn('Redis attempting to reconnect'));
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisClientProvider, RedisService],
  exports: [RedisService],
})
export class RedisModule {}
