import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { RedisClientType } from 'redis';

import { REDIS_CLIENT } from './redis.constants';

type RedisClient = RedisClientType<any, any, any>;

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: RedisClient,
  ) {}

  /**
   * Returns the underlying ioredis client for advanced use cases.
   */
  getClient(): RedisClient {
    return this.client;
  }

  /**
   * Simple health check helper.
   */
  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    try {
      await this.client.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error(
        'Failed to close Redis connection gracefully, forcing disconnect',
        (error as Error).stack,
      );
      void this.client.disconnect();
    }
  }
}
