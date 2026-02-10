import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for skipping onboarding check
 */
export const SKIP_ONBOARDING_CHECK_KEY = 'skipOnboardingCheck';

/**
 * Decorator to skip onboarding status check for specific routes
 * Use this on endpoints that should be accessible even when onboarding is not complete
 *
 * Examples of routes that should skip:
 * - Login, Register, Logout
 * - Password reset, Email verification
 * - Onboarding steps (tenant creation, tenant settings)
 * - Invitation accept/decline
 * - Get my tenants, Get my invitations
 */
export const SkipOnboardingCheck = () =>
  SetMetadata(SKIP_ONBOARDING_CHECK_KEY, true);
