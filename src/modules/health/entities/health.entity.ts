import { ApiProperty } from '@nestjs/swagger';

class MemoryUsage {
  @ApiProperty({
    description: 'Memory used in megabytes',
    example: 45,
  })
  used: number;

  @ApiProperty({
    description: 'Total memory allocated in megabytes',
    example: 128,
  })
  total: number;

  @ApiProperty({
    description: 'Percentage of memory used',
    example: 35.16,
  })
  percentage: number;
}

class DatabaseHealth {
  @ApiProperty({
    description: 'Database connection status',
    enum: ['connected', 'disconnected', 'error'],
    example: 'connected',
  })
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'Database response time in milliseconds',
    example: 15,
    required: false,
  })
  responseTime?: number;

  @ApiProperty({
    description: 'Error message if database check failed',
    example: 'Connection timeout',
    required: false,
  })
  error?: string;
}

class RedisHealth {
  @ApiProperty({
    description: 'Redis connection status',
    enum: ['connected', 'disconnected', 'error'],
    example: 'connected',
  })
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'Redis response time in milliseconds',
    example: 5,
    required: false,
  })
  responseTime?: number;

  @ApiProperty({
    description: 'Error message if Redis check failed',
    example: 'Connection refused',
    required: false,
  })
  error?: string;
}

export class HealthEntity {
  @ApiProperty({
    description: 'Overall health status of the application',
    enum: ['healthy', 'unhealthy', 'degraded'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({
    description: 'Timestamp when the health check was performed',
    example: '2025-11-26T04:20:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Server uptime in HH:MM:SS format',
    example: '02:30:45',
  })
  uptime: string;

  @ApiProperty({
    description: 'Memory usage statistics',
    type: MemoryUsage,
  })
  memory: MemoryUsage;

  @ApiProperty({
    description: 'Database health information',
    type: DatabaseHealth,
  })
  database: DatabaseHealth;

  @ApiProperty({
    description: 'Redis health information',
    type: RedisHealth,
  })
  redis: RedisHealth;

  @ApiProperty({
    description: 'Application version',
    example: '0.0.1',
  })
  version: string;

  @ApiProperty({
    description: 'Current environment',
    example: 'development',
    enum: ['development', 'production', 'test'],
  })
  environment: 'development' | 'production' | 'test';
}
