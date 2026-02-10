/**
 * System Role Constants
 *
 * This file contains centralized constants for system-defined roles
 * that have special protections and behaviors.
 */

/**
 * SuperAdmin role name - This is the main tenant owner role
 * This role CANNOT be:
 * - Renamed
 * - Deleted
 * - Have its permissions removed/modified
 */
export const SUPER_ADMIN_ROLE = 'SuperAdmin';

/**
 * List of protected role names that cannot be modified or deleted
 */
export const PROTECTED_ROLES = [SUPER_ADMIN_ROLE] as const;

/**
 * Check if a role name is protected
 */
export function isProtectedRole(roleName: string): boolean {
  return PROTECTED_ROLES.includes(roleName as (typeof PROTECTED_ROLES)[number]);
}
