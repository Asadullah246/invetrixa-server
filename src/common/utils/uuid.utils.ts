/**
 * UUID validation utilities
 */

/**
 * UUID v4 regex pattern
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * General UUID regex pattern (any version)
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID (any version)
 * @param value - The string to check
 * @returns true if the string is a valid UUID
 *
 * @example
 * isUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isUUID('my-slug') // false
 */
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Check if a string is a valid UUID v4
 * @param value - The string to check
 * @returns true if the string is a valid UUID v4
 */
export function isUUIDv4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

/**
 * Determine if an identifier is a UUID or a slug
 * @param identifier - The identifier to check
 * @returns 'uuid' or 'slug'
 */
export function getIdentifierType(identifier: string): 'uuid' | 'slug' {
  return isUUID(identifier) ? 'uuid' : 'slug';
}
