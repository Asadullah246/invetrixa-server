import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from './services/access-control.service';
import { PERMISSION_KEY } from './decorator/permission.decorator';
import type { Request } from 'express';
import getHeaderValue from '@/common/utils/header-extractor';

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private acService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<{
      resource: string; // Module name (e.g. "Product")
      action: string; // Action key (e.g. "product.create")
    }>(PERMISSION_KEY, context.getHandler());

    if (!metadata) return true;

    const { resource, action } = metadata;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const tenantId = getHeaderValue(request, 'x-tenant-id');
    const locationId = getHeaderValue(request, 'x-location-id');

    if (!tenantId) {
      throw new ForbiddenException('Access denied: missing tenant id');
    }

    const hasAccess = await this.acService.hasPermission(
      user.id,
      resource,
      action,
      tenantId,
      locationId ?? null,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied: missing permission ${resource}:${action}`,
      );
    }

    return true;
  }
}
