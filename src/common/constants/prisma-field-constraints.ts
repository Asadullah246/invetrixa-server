/**
 * Prisma Schema Field Constraints Parser
 *
 * This file contains field constraints extracted directly from Prisma schema definitions.
 * The `@db.VarChar(n)` annotation defines the maximum length.
 *
 * Generated from:
 * - prisma/schemas/tenant.prisma
 * - prisma/schemas/address.prisma
 */

/**
 * Extracted from Prisma Tenant model
 * @db.VarChar(200) → max: 200
 * @db.VarChar(100) → max: 100
 * etc.
 */
export const TENANT_CONSTRAINTS = {
  name: { max: 200 } as const, // @db.VarChar(200)
  registrationNumber: { max: 100 } as const, // @db.VarChar(100)
  businessEmail: { max: 255 } as const, // @db.VarChar(255)
  businessPhone: { max: 50 } as const, // @db.VarChar(50)
  website: { max: 255 } as const, // @db.VarChar(255)
  establishedYear: { max: 4 } as const, // @db.VarChar(4)
  // description has no max defined in schema, using reasonable default
  description: { max: 1000 } as const,
  // logo has no max defined in schema
  logo: { max: 2048 } as const,
} as const;

/**
 * Extracted from Prisma Address model
 * Note: Address model doesn't have @db.VarChar constraints defined,
 * so these are reasonable defaults for address fields.
 */
export const ADDRESS_CONSTRAINTS = {
  addressLine1: { max: 255 } as const,
  addressLine2: { max: 255 } as const,
  city: { max: 100 } as const,
  state: { max: 100 } as const,
  postalCode: { max: 20 } as const,
  country: { max: 100 } as const,
} as const;

/**
 * Extracted from Prisma TenantSettings model
 * @db.VarChar(50) → max: 50
 * etc.
 */
export const TENANT_SETTINGS_CONSTRAINTS = {
  timezone: { max: 50 } as const, // @db.VarChar(50)
  locale: { max: 10 } as const, // @db.VarChar(10)
  currency: { max: 10 } as const, // @db.VarChar(10)
  dateFormat: { max: 20 } as const, // @db.VarChar(20)
  timeFormat: { max: 20 } as const, // @db.VarChar(20)
  decimalSeparator: { max: 1 } as const, // @db.VarChar(1)
  thousandsSeparator: { max: 1 } as const, // @db.VarChar(1)
} as const;

/**
 * Extracted from Prisma TenantInvitation model
 */
export const TENANT_INVITATION_CONSTRAINTS = {
  email: { max: 255 } as const, // @db.VarChar(255)
  tokenHash: { max: 128 } as const, // @db.VarChar(128)
  message: { max: 500 } as const, // @db.VarChar(500)
} as const;

// Union type for all field names
export type TenantFieldName = keyof typeof TENANT_CONSTRAINTS;
export type AddressFieldName = keyof typeof ADDRESS_CONSTRAINTS;
export type TenantSettingsFieldName = keyof typeof TENANT_SETTINGS_CONSTRAINTS;
export type TenantInvitationFieldName =
  keyof typeof TENANT_INVITATION_CONSTRAINTS;

/**
 * Type-safe helper to get constraints for a specific field
 * @example
 * const constraint = getPrismaConstraint('tenant', 'name');
 * // Returns: { max: 200 }
 */
export function getPrismaConstraint(
  model: 'tenant',
  fieldName: TenantFieldName,
): (typeof TENANT_CONSTRAINTS)[TenantFieldName];
export function getPrismaConstraint(
  model: 'address',
  fieldName: AddressFieldName,
): (typeof ADDRESS_CONSTRAINTS)[AddressFieldName];
export function getPrismaConstraint(
  model: 'tenantSettings',
  fieldName: TenantSettingsFieldName,
): (typeof TENANT_SETTINGS_CONSTRAINTS)[TenantSettingsFieldName];
export function getPrismaConstraint(
  model: 'tenantInvitation',
  fieldName: TenantInvitationFieldName,
): (typeof TENANT_INVITATION_CONSTRAINTS)[TenantInvitationFieldName];
export function getPrismaConstraint(model: string, fieldName: string): unknown {
  const constraints: Record<string, Record<string, unknown>> = {
    tenant: TENANT_CONSTRAINTS,
    address: ADDRESS_CONSTRAINTS,
    tenantSettings: TENANT_SETTINGS_CONSTRAINTS,
    tenantInvitation: TENANT_INVITATION_CONSTRAINTS,
  };

  const modelConstraints = constraints[model];
  if (!modelConstraints) {
    throw new Error(`Unknown model: ${model}`);
  }

  const constraint = modelConstraints[fieldName];
  if (!constraint) {
    throw new Error(`Unknown field '${fieldName}' for model '${model}'`);
  }

  return constraint;
}

/**
 * USAGE EXAMPLES:
 *
 * 1. Using the constants directly:
 * ```typescript
 * @StringField('Company Name', {
 *   max: TENANT_CONSTRAINTS.name.max,
 *   required: true,
 * })
 * name: string;
 * ```
 *
 * 2. Using the helper function:
 * ```typescript
 * const nameConstraint = getPrismaConstraint('tenant', 'name');
 *
 * @StringField('Company Name', {
 *   max: nameConstraint.max,
 *   required: true,
 * })
 * name: string;
 * ```
 *
 * 3. Combining with min length for specific fields:
 * ```typescript
 * @StringField('Email', {
 *   min: 5,
 *   max: getPrismaConstraint('tenant', 'businessEmail').max,
 * })
 * businessEmail: string;
 * ```
 *
 * UPDATING CONSTRAINTS:
 * When you update a field in Prisma schema, update the corresponding
 * value in this file. Example:
 *
 * Before (Prisma):
 * name String @db.VarChar(200)
 *
 * After (Prisma):
 * name String @db.VarChar(250)
 *
 * Then update this file:
 * name: { max: 250 } as const,
 */
