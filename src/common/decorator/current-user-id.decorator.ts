import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

/**
 * Custom parameter decorator to extract current user's ID from request.
 * Returns empty string if user is not authenticated.
 *
 * Usage:
 * ```ts
 * @Post('items')
 * async create(
 *   @CurrentUserId() userId: string,
 *   @Body() dto: CreateItemDto,
 * ) {
 *   return this.service.create(userId, dto);
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user?.id ?? '';
  },
);
