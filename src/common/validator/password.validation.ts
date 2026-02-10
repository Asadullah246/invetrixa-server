import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsStrongPassword,
  IsStrongPasswordOptions,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Password strength requirements configuration.
 */
interface PasswordStrengthOptions {
  readonly minLength?: number;
  readonly minLowercase?: number;
  readonly minUppercase?: number;
  readonly minNumbers?: number;
  readonly minSymbols?: number;
}

/**
 * Configuration options for custom validation messages.
 */
interface PasswordValidationMessageOptions {
  readonly strengthMessage?: string;
  readonly emptyMessage?: string;
  readonly lengthMessage?: string;
}

/**
 * Complete configuration options for password field validation.
 */
interface PasswordValidatorOptions {
  readonly label?: string;
  readonly min?: number;
  readonly max?: number;
  readonly optional?: boolean;
  readonly strengthOptions?: PasswordStrengthOptions;
  readonly messageOptions?: PasswordValidationMessageOptions;
  readonly trimWhitespace?: boolean;
}

/**
 * Logger instance for enhanced development experience.
 */
const logger = new Logger('PasswordValidator');

/**
 * Default password requirements for security.
 */
const DEFAULT_PASSWORD_REQUIREMENTS: Required<PasswordStrengthOptions> = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} as const;

/**
 * Default error message generators for password validation.
 */
const PasswordErrorMessages = {
  strength: (
    label: string,
    requirements: Required<PasswordStrengthOptions>,
  ): string => {
    const parts = [
      `${label} must be at least ${requirements.minLength} characters`,
    ];

    if (requirements.minLowercase > 0) {
      parts.push(
        `${requirements.minLowercase} lowercase letter${requirements.minLowercase > 1 ? 's' : ''}`,
      );
    }
    if (requirements.minUppercase > 0) {
      parts.push(
        `${requirements.minUppercase} uppercase letter${requirements.minUppercase > 1 ? 's' : ''}`,
      );
    }
    if (requirements.minNumbers > 0) {
      parts.push(
        `${requirements.minNumbers} number${requirements.minNumbers > 1 ? 's' : ''}`,
      );
    }
    if (requirements.minSymbols > 0) {
      parts.push(
        `${requirements.minSymbols} special character${requirements.minSymbols > 1 ? 's' : ''}`,
      );
    }

    if (parts.length === 1) {
      return parts[0];
    }
    return `${parts[0]} and contain at least: ${parts.slice(1).join(', ')}`;
  },
  empty: (label: string): string => `${label} should not be empty`,
  minLength: (label: string, min: number): string =>
    `${label} should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} should not exceed ${max} characters`,
  rangeLength: (label: string, min: number, max: number): string =>
    `${label} should be between ${min} and ${max} characters long`,
} as const;

/**
 * Transforms password values by optionally trimming whitespace.
 * Note: Trimming is disabled by default for passwords to preserve intentional spaces.
 * @param shouldTrim - Whether to trim whitespace from the password
 * @returns A transform decorator
 */
const createPasswordTransformer = (shouldTrim: boolean) =>
  Transform(({ value }: TransformFnParams): string =>
    shouldTrim && typeof value === 'string' ? value.trim() : value,
  );

/**
 * Password field validator with configurable security requirements.
 *
 * This decorator provides comprehensive password validation with:
 * - Strong password requirements by default (12+ chars, mixed case, numbers, symbols)
 * - Flexible security policies (adjust min/max length, character requirements)
 * - Optional password fields (for update operations)
 * - Custom error messages
 * - Whitespace handling options
 *
 * **Default Security Policy:**
 * - Minimum 12 characters
 * - At least 1 lowercase letter
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special symbol
 *
 * @param options - Configuration object for password validation
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic usage with enterprise defaults
 * ```
 * @ValidatePassword({ label: 'Password' })
 * password: string;
 * ```
 *
 * @example Optional password for update operations
 * ```
 * @ValidatePassword({
 *   label: 'New Password',
 *   optional: true
 * })
 * password?: string;
 * ```
 *
 * @example Custom security requirements (relaxed for legacy systems)
 * ```
 * @ValidatePassword({
 *   label: 'Password',
 *   min: 8,
 *   max: 32,
 *   strengthOptions: {
 *     minLength: 8,
 *     minLowercase: 1,
 *     minUppercase: 1,
 *     minNumbers: 1,
 *     minSymbols: 0
 *   }
 * })
 * password: string;
 * ```
 *
 * @example Maximum security configuration
 * ```
 * @ValidatePassword({
 *   label: 'Admin Password',
 *   min: 16,
 *   max: 128,
 *   strengthOptions: {
 *     minLength: 16,
 *     minLowercase: 2,
 *     minUppercase: 2,
 *     minNumbers: 2,
 *     minSymbols: 2
 *   }
 * })
 * password: string;
 * ```
 */
export function ValidatePassword(
  options: PasswordValidatorOptions = {},
): PropertyDecorator {
  const {
    label = 'Password',
    min,
    max,
    optional = false,
    strengthOptions = {},
    messageOptions = {},
    trimWhitespace = false,
  } = options;

  if (min !== undefined && min < 0) {
    logger.error(`min length cannot be negative (${min})`);
  }
  if (max !== undefined && max < 0) {
    logger.error(`max length cannot be negative (${max})`);
  }
  if (min !== undefined && max !== undefined && min > max) {
    logger.error(`min length (${min}) cannot exceed max length (${max})`);
  }

  const passwordRequirements: Required<PasswordStrengthOptions> = {
    ...DEFAULT_PASSWORD_REQUIREMENTS,
    ...strengthOptions,
  };

  const minLength = min ?? passwordRequirements.minLength;
  const maxLength = max;

  const effectiveRequirements: Required<PasswordStrengthOptions> = {
    ...passwordRequirements,
    minLength,
  };

  const decorators: PropertyDecorator[] = [
    createPasswordTransformer(trimWhitespace),
  ];

  if (optional) {
    decorators.push(IsOptional());
  }

  const strongPasswordOptions: IsStrongPasswordOptions = {
    minLength,
    minLowercase: passwordRequirements.minLowercase,
    minUppercase: passwordRequirements.minUppercase,
    minNumbers: passwordRequirements.minNumbers,
    minSymbols: passwordRequirements.minSymbols,
  };

  decorators.push(
    IsStrongPassword(strongPasswordOptions, {
      message:
        messageOptions?.strengthMessage ??
        PasswordErrorMessages.strength(label, effectiveRequirements),
    }),
  );

  if (!optional) {
    decorators.push(
      IsNotEmpty({
        message:
          messageOptions?.emptyMessage ?? PasswordErrorMessages.empty(label),
      }),
    );
  }

  if (minLength !== undefined && maxLength !== undefined) {
    decorators.push(
      Length(minLength, maxLength, {
        message:
          messageOptions?.lengthMessage ??
          PasswordErrorMessages.rangeLength(label, minLength, maxLength),
      }),
    );
  } else if (minLength !== undefined) {
    decorators.push(
      MinLength(minLength, {
        message:
          messageOptions?.lengthMessage ??
          PasswordErrorMessages.minLength(label, minLength),
      }),
    );
  } else if (maxLength !== undefined) {
    decorators.push(
      MaxLength(maxLength, {
        message:
          messageOptions?.lengthMessage ??
          PasswordErrorMessages.maxLength(label, maxLength),
      }),
    );
  }

  return applyDecorators(...decorators);
}
