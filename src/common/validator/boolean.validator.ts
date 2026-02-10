import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Configuration options for custom validation messages.
 */
interface ValidationMessageOptions {
  readonly typeMessage?: string;
  readonly emptyMessage?: string;
}

/**
 * Complete configuration options for boolean field validation.
 */
interface BooleanValidatorOptions {
  readonly label: string;
  readonly optional?: boolean;
  readonly messageOptions?: ValidationMessageOptions;
}

/**
 * Default error message generators for boolean validation.
 */
export const BooleanErrorMessages = {
  type: (label: string): string => `${label} must be a boolean value`,
  empty: (label: string): string => `${label} cannot be empty`,
} as const;

/**
 * Transforms values to boolean and handles various input formats.
 * Supports string representations ('true', 'false', '1', '0') and numeric values (1, 0).
 */
const booleanTransformer = Transform(
  ({
    value,
  }: TransformFnParams): boolean | string | number | null | undefined => {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') {
        return true;
      }
      if (trimmed === 'false' || trimmed === '0') {
        return false;
      }
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return value;
    }

    return value;
  },
);

/**
 * Universal boolean field validator with comprehensive validation options.
 *
 * This decorator handles boolean validation scenarios:
 * - Required boolean fields
 * - Optional boolean fields
 * - Custom error messages
 * - Automatic transformation from string/number to boolean
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required boolean
 * ```
 * @ValidateBoolean({
 *   label: 'Is Active'
 * })
 * isActive: boolean;
 * ```
 *
 * @example Optional boolean
 * ```
 * @ValidateBoolean({
 *   label: 'Is Verified',
 *   optional: true
 * })
 * isVerified?: boolean;
 * ```
 *
 * @example Boolean with custom messages
 * ```
 * @ValidateBoolean({
 *   label: 'Terms Accepted',
 *   messageOptions: {
 *     typeMessage: 'You must accept the terms and conditions',
 *     emptyMessage: 'Terms acceptance is required'
 *   }
 * })
 * termsAccepted: boolean;
 * ```
 */
export function ValidateBoolean(
  options: BooleanValidatorOptions,
): PropertyDecorator {
  const { label, optional = false, messageOptions } = options;

  const decorators: PropertyDecorator[] = [booleanTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  decorators.push(
    IsBoolean({
      message: messageOptions?.typeMessage ?? BooleanErrorMessages.type(label),
    }),
  );

  if (!optional) {
    decorators.push(
      IsNotEmpty({
        message:
          messageOptions?.emptyMessage ?? BooleanErrorMessages.empty(label),
      }),
    );
  }

  return applyDecorators(...decorators);
}
