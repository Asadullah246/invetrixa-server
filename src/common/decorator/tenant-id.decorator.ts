import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Custom parameter decorator to extract tenant ID from x-tenant-id header.
 * Throws BadRequestException if header is missing.
 *
 * Usage:
 * ```ts
 * @Get('items')
 * async findAll(@TenantId() tenantId: string) {
 *   return this.service.findAll(tenantId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('x-tenant-id header is required');
    }

    return tenantId;
  },
);
