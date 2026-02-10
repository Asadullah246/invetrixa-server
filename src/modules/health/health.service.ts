import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

import { HealthEntity } from './entities/health.entity';
import { version } from '@/../package.json';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Performs a comprehensive health check of the application
   */
  async performHealthCheck(): Promise<HealthEntity> {
    const startTime = Date.now();
    const healthEntity: HealthEntity = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime(process.uptime()),
      memory: this.getMemoryUsage(),
      database: {
        status: 'disconnected',
      },
      redis: {
        status: 'disconnected',
      },
      version: this.config.get('APP_VERSION') || version,
      environment: this.config.get('app.nodeEnv') || 'development',
    };

    try {
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      healthEntity.database = dbHealth;

      if (dbHealth.status === 'error') {
        healthEntity.status = 'unhealthy';
      }

      // Check Redis health
      const redisHealth = await this.checkRedisHealth();
      healthEntity.redis = redisHealth;

      if (redisHealth.status === 'error') {
        healthEntity.status =
          healthEntity.status === 'healthy' ? 'degraded' : healthEntity.status;
      }

      const totalResponseTime = Date.now() - startTime;
      this.logger.log(
        `Health check completed in ${totalResponseTime}ms - Status: ${healthEntity.status}`,
      );

      return healthEntity;
    } catch (error) {
      this.logger.error('Health check failed', (error as Error).stack);
      healthEntity.status = 'unhealthy';
      return healthEntity;
    }
  }

  /**
   * Checks database connectivity and response time
   */
  private async checkDatabaseHealth(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Database health check failed', (error as Error).stack);

      return {
        status: 'error',
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Checks Redis connectivity and response time
   */
  private async checkRedisHealth(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Ping Redis to check connectivity
      const result = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (result === 'PONG') {
        return {
          status: 'connected',
          responseTime,
        };
      }

      return {
        status: 'error',
        responseTime,
        error: 'Unexpected ping response',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Redis health check failed', (error as Error).stack);

      return {
        status: 'error',
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Gets current memory usage statistics
   */
  private getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    const percentage = (used / total) * 100;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Formats uptime in seconds to HH:MM:SS format
   */
  private formatUptime(uptimeInSeconds: number): string {
    const hours = Math.floor(uptimeInSeconds / 3600);
    const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeInSeconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Monitors memory usage and logs warnings if thresholds are exceeded
   */
  checkMemoryLeak(): void {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed / 1024 / 1024; // MB
    const heapTotal = memUsage.heapTotal / 1024 / 1024; // MB

    // Alert if memory usage is high
    if (heapUsed > 512) {
      // 512MB threshold
      this.logger.warn(
        `High memory usage: ${Math.round(heapUsed)}MB / ${Math.round(heapTotal)}MB`,
      );
    }

    // Alert if memory usage percentage is high
    const usagePercentage = (heapUsed / heapTotal) * 100;
    if (usagePercentage > 80) {
      this.logger.warn(
        `High memory usage percentage: ${Math.round(usagePercentage)}%`,
      );
    }
  }

  /**
   * Monitors process metrics including CPU and event loop lag
   */
  async monitorProcess() {
    // Monitor CPU usage
    const cpuUsage = process.cpuUsage();

    // Measure event loop lag by scheduling a callback
    const startTime = Date.now();
    await new Promise((resolve) => setImmediate(resolve));
    const eventLoopLag = Date.now() - startTime;

    if (eventLoopLag > 100) {
      this.logger.warn(`Event loop lag detected: ${eventLoopLag}ms`);
    }

    return {
      cpuUsage,
      eventLoopLag,
      memoryUsage: this.getMemoryUsage(),
    };
  }
}
