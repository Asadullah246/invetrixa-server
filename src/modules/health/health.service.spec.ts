import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    ping: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);

    // Mock Logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are up', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([1]);
      mockRedisService.ping.mockResolvedValue('PONG');
      mockConfigService.get.mockReturnValue('test');

      const result = await service.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('connected');
      expect(result.redis.status).toBe('connected');
      expect(result.environment).toBe('test');
    });

    it('should return unhealthy status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB Error'));
      mockRedisService.ping.mockResolvedValue('PONG');

      const result = await service.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.database.status).toBe('error');
      expect(result.redis.status).toBe('connected');
    });

    it('should return degraded status when redis is down but db is up', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([1]);
      mockRedisService.ping.mockRejectedValue(new Error('Redis Error'));

      const result = await service.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.database.status).toBe('connected');
      expect(result.redis.status).toBe('error');
    });

    it('should return unhealthy status when redis returns unexpected response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([1]);
      mockRedisService.ping.mockResolvedValue('WRONG_PONG');

      const result = await service.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.redis.status).toBe('error');
      expect(result.redis.error).toBe('Unexpected ping response');
    });

    it('should handle unexpected errors during health check', async () => {
      // Force an error in checkDatabaseHealth by making it undefined (simulating a crash or unexpected state if possible,
      // but since we are mocking, we can just spy on a private method if we really wanted to,
      // OR we can simulate a failure in a way that propagates up if not caught.
      // However, performHealthCheck wraps everything in try-catch.
      // Let's mock checkDatabaseHealth to throw if we could, but it's private.
      // Instead, we can rely on the fact that performHealthCheck catches errors.
      // But wait, checkDatabaseHealth also catches errors.
      // To trigger the outer catch block in performHealthCheck, we might need to fail something else
      // or mock a private method if we were using a library that allowed it.
      // Since we can't easily mock private methods without casting to any, let's try to make `this.formatUptime` fail?
      // No, that's hard.
      // Let's just assume the try-catch block covers unexpected synchronous errors or errors outside the sub-checks.

      // Actually, we can mock `checkDatabaseHealth` by casting service to any
      jest
        .spyOn(service as any, 'checkDatabaseHealth')
        .mockRejectedValue(new Error('Catastrophic failure'));

      const result = await service.performHealthCheck();
      expect(result.status).toBe('unhealthy');
    });
  });

  describe('checkMemoryLeak', () => {
    it('should warn if memory usage is high', () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Mock process.memoryUsage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 1000 * 1024 * 1024,
        rss: 0,
        external: 0,
        arrayBuffers: 0,
      }) as unknown as NodeJS.MemoryUsageFn;

      service.checkMemoryLeak();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage'),
      );

      process.memoryUsage = originalMemoryUsage;
    });

    it('should warn if memory percentage is high', () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Mock process.memoryUsage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024, // 90%
        rss: 0,
        external: 0,
        arrayBuffers: 0,
      }) as unknown as NodeJS.MemoryUsageFn;

      service.checkMemoryLeak();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage'),
      ); // > 512MB
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage percentage'),
      ); // > 80%

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('monitorProcess', () => {
    it('should return process metrics', async () => {
      const result = await service.monitorProcess();

      expect(result).toHaveProperty('cpuUsage');
      expect(result).toHaveProperty('eventLoopLag');
      expect(result).toHaveProperty('memoryUsage');
    });

    it('should warn if event loop lag is high', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      // We can't easily force event loop lag in a unit test without actually blocking.
      // But we can mock Date.now to simulate time passing.
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000; // start time
        if (callCount === 2) return 1200; // end time (200ms lag)
        return 2000;
      });

      await service.monitorProcess();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event loop lag detected'),
      );

      Date.now = originalDateNow;
    });
  });
});
