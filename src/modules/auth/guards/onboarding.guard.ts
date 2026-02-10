import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { OnboardingStatus } from 'generated/prisma/client';
import { SKIP_ONBOARDING_CHECK_KEY } from '../decorators/skip-onboarding-check.decorator';

interface SessionUser {
  id: string;
  onboardingStatus?: OnboardingStatus;
}

/**
 * Guard that checks if user has completed onboarding
 * Blocks access to protected routes if onboarding is not complete
 *
 * Use @SkipOnboardingCheck() decorator to bypass this guard for specific routes
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked to skip onboarding check
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ONBOARDING_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as SessionUser | undefined;

    // If no user in session (not authenticated), let AuthenticatedGuard handle it
    if (!user) {
      return true;
    }

    // Check onboarding status
    if (user.onboardingStatus !== OnboardingStatus.COMPLETED) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'OnboardingNotCompleted',
        message:
          'Please complete your onboarding before accessing this resource.',
      });
    }

    return true;
  }
}
