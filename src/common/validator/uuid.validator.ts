import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * Supported UUID versions.
 */
export type UUIDVersion = '3' | '4' | '5' | 'all';

/**
 * Configuration options for UUID validation.
 */
export interface UUIDValidatorOptions {
  readonly label: string;
  readonly optional?: boolean;
  readonly version?: UUIDVersion;
  readonly message?: string;
  readonly each?: boolean;
}

/**
 * Default error message generators for UUID validation.
 */
const ErrorMessages = {
  uuid: (label: string, version?: UUIDVersion): string =>
    `${label} must be a valid UUID${version ? ` (v${version})` : ''}`,
  empty: (label: string): string => `${label} should not be empty`,
} as const;

/**
 * Transforms string values by trimming whitespace.
 */
const trimTransformer = Transform(({ value }: TransformFnParams): any =>
  typeof value === 'string' ? value.trim() : value,
);

/**
 * Universal UUID field validator.
 *
 * Validates UUIDs with support for:
 * - Version-specific validation (v3, v4, v5, or all)
 * - Optional/Required field control
 * - Array validation (each option)
 * - Custom error messages
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required UUID v4
 * ```
 * @ValidateUUID({
 *   label: 'User ID',
 *   version: '4'
 * })
 * userId: string;
 * ```
 *
 * @example Optional UUID (any version)
 * ```
 * @ValidateUUID({
 *   label: 'Reference ID',
 *   optional: true
 * })
 * referenceId?: string;
 * ```
 *
 * @example UUID array validation
 * ```
 * @ValidateUUID({
 *   label: 'Product IDs',
 *   version: '4',
 *   each: true
 * })
 * productIds: string[];
 * ```
 */
export function ValidateUUID(options: UUIDValidatorOptions): PropertyDecorator {
  const { label, optional = false, version, message, each = false } = options;

  const decorators: PropertyDecorator[] = [trimTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  decorators.push(
    IsUUID(version, {
      message: message ?? ErrorMessages.uuid(label, version),
      each,
    }),
  );

  if (!optional) {
    decorators.push(
      IsNotEmpty({
        message: ErrorMessages.empty(label),
        each,
      }),
    );
  }

  return applyDecorators(...decorators);
}
