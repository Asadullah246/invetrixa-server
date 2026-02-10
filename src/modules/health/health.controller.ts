import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiGetOne } from '@/common/decorator/api';
import { HealthEntity } from './entities/health.entity';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiGetOne('Server health check', {
    type: HealthEntity,
    description:
      'Returns comprehensive health status including database connectivity, Redis status, memory usage, and system uptime',
    requiresAuth: false,
  })
  async getHealth(): Promise<HealthEntity> {
    return this.healthService.performHealthCheck();
  }
}
