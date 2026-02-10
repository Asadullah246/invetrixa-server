import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsEnum } from 'class-validator';

/**
 * Configuration options for enum validation.
 */
interface EnumValidatorOptions {
  readonly label: string;
  readonly enum: object;
  readonly optional?: boolean;
  readonly message?: string;
}

/**
 * Default error message generators for enum validation.
 */
const EnumErrorMessages = {
  invalid: (label: string, enumValues: string[]): string =>
    `${label} must be one of the following values: ${enumValues.join(', ')}`,
} as const;

/**
 * Transforms enum value by trimming whitespace if it's a string.
 */
const enumTransformer = Transform(({ value }: TransformFnParams): any =>
  typeof value === 'string' ? value.trim() : value,
);

/**
 * Helper function to get enum values as array.
 * @param enumObj - The enum object to extract values from
 * @returns Array of enum values (strings or numbers)
 */
function getEnumValues(enumObj: object): (string | number)[] {
  const record = enumObj as Record<string, string | number>;
  return Object.keys(record)
    .filter((key) => isNaN(Number(key)))
    .map((key) => record[key]);
}

/**
 * Universal enum field validator with optional support.
 *
 * Supports:
 * - String enums
 * - Numeric enums
 * - Mixed enums
 * - Optional/Required field control
 * - Automatic whitespace trimming for string values
 * - Custom error messages with enum values listed
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required enum
 * ```
 * enum UserRole {
 *   ADMIN = 'ADMIN',
 *   USER = 'USER',
 *   MODERATOR = 'MODERATOR'
 * }
 *
 * @ValidateEnum({
 *   label: 'Role',
 *   enum: UserRole
 * })
 * role: UserRole;
 * ```
 *
 * @example Optional enum
 * ```
 * enum Status {
 *   ACTIVE = 1,
 *   INACTIVE = 0,
 *   PENDING = 2
 * }
 *
 * @ValidateEnum({
 *   label: 'Status',
 *   enum: Status,
 *   optional: true
 * })
 * status?: Status;
 * ```
 *
 * @example Enum with custom message
 * ```
 * enum OrderStatus {
 *   PENDING = 'pending',
 *   PROCESSING = 'processing',
 *   COMPLETED = 'completed',
 *   CANCELLED = 'cancelled'
 * }
 *
 * @ValidateEnum({
 *   label: 'Order Status',
 *   enum: OrderStatus,
 *   message: 'Invalid order status provided'
 * })
 * orderStatus: OrderStatus;
 * ```
 */
export function ValidateEnum(options: EnumValidatorOptions): PropertyDecorator {
  const { label, enum: enumObj, optional = false, message } = options;

  const decorators: PropertyDecorator[] = [enumTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  const enumValues = getEnumValues(enumObj);
  const enumValuesStr = enumValues.map((v) => String(v));

  decorators.push(
    IsEnum(enumObj, {
      message: message ?? EnumErrorMessages.invalid(label, enumValuesStr),
    }),
  );

  return applyDecorators(...decorators);
}
