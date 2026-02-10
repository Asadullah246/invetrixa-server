import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  MaxLength,
  MinLength,
  Length,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  parsePhoneNumberWithError,
  CountryCode,
  isValidPhoneNumber,
  PhoneNumber,
} from 'libphonenumber-js';

/**
 * Configuration options for phone number validation.
 */
interface PhoneNumberValidatorOptions {
  readonly label: string;
  readonly region?: CountryCode;
  readonly min?: number;
  readonly max?: number;
  readonly optional?: boolean;
  readonly strictValidation?: boolean;
  readonly message?: string;
  readonly lengthMessage?: string;
}

/**
 * Logger instance for enhanced development experience.
 */
const logger = new Logger('PhoneNumberValidator');

/**
 * Default error message generators for phone number validation.
 */
const PhoneNumberErrorMessages = {
  invalid: (label: string, region?: CountryCode): string =>
    region
      ? `${label} is not a valid ${region} phone number`
      : `${label} is not a valid phone number`,
  minLength: (label: string, min: number): string =>
    `${label} should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} should not exceed ${max} characters`,
  rangeLength: (label: string, min: number, max: number): string =>
    `${label} should be between ${min} and ${max} characters`,
} as const;

/**
 * Transforms phone number by trimming whitespace and normalizing format.
 * Removes common formatting characters (spaces, hyphens, parentheses, dots) but keeps + for international.
 */
const phoneTransformer = Transform(({ value }: TransformFnParams): string => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.replace(/[\s\-().]/g, '');
});

/**
 * Custom validator function using libphonenumber-js.
 * @param value - The phone number value to validate
 * @param region - Optional country code for region-specific validation
 * @param strictValidation - Whether to strictly validate the country matches the region
 * @returns True if the phone number is valid, false otherwise
 */
function isValidPhone(
  value: any,
  region?: CountryCode,
  strictValidation: boolean = true,
): boolean {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  try {
    const isValid = isValidPhoneNumber(value, region);

    if (!isValid) {
      return false;
    }

    if (strictValidation) {
      let phoneNumber: PhoneNumber;
      try {
        phoneNumber = parsePhoneNumberWithError(value, region);
      } catch {
        return false;
      }

      return (
        phoneNumber.isValid() &&
        (region ? phoneNumber.country === region : true)
      );
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Custom decorator that uses libphonenumber-js for validation.
 * @param region - Optional country code for region-specific validation
 * @param strictValidation - Whether to strictly validate the country matches the region
 * @param validationOptions - Optional validation options
 * @returns A property decorator that validates phone numbers
 */
function IsValidPhoneNumber(
  region?: CountryCode,
  strictValidation: boolean = true,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return isValidPhone(value, region, strictValidation);
        },
        defaultMessage(args: ValidationArguments) {
          return (
            (validationOptions?.message as string) ||
            `${args.property} is not a valid phone number`
          );
        },
      },
    });
  };
}

/**
 * Universal phone number field validator with comprehensive validation options.
 *
 * Uses libphonenumber-js for accurate international phone number validation.
 * Supports:
 * - International phone number validation
 * - Region/country code specification (e.g., 'US', 'GB', 'BD')
 * - Strict validation (verifies country matches region)
 * - Length constraints (min, max, range)
 * - Optional/Required field control
 * - Automatic whitespace trimming and normalization
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required phone number (any region)
 * ```
 * @ValidatePhoneNumber({ label: 'Phone Number' })
 * phone: string;
 * ```
 *
 * @example Phone number with specific region
 * ```
 * @ValidatePhoneNumber({
 *   label: 'US Phone',
 *   region: 'US'
 * })
 * usPhone: string;
 * ```
 *
 * @example Optional phone number with length constraints
 * ```
 * @ValidatePhoneNumber({
 *   label: 'Business Phone',
 *   optional: true,
 *   min: 6,
 *   max: 20
 * })
 * businessPhone?: string;
 * ```
 *
 * @example Bangladesh phone number with strict validation
 * ```
 * @ValidatePhoneNumber({
 *   label: 'Mobile',
 *   region: 'BD',
 *   strictValidation: true,
 *   min: 11,
 *   max: 14
 * })
 * mobile: string;
 * ```
 */
export function ValidatePhoneNumber(
  options: PhoneNumberValidatorOptions,
): PropertyDecorator {
  const {
    label,
    region,
    min,
    max,
    optional = false,
    strictValidation = true,
    message,
    lengthMessage,
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

  const decorators: PropertyDecorator[] = [phoneTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  decorators.push(
    IsValidPhoneNumber(region, strictValidation, {
      message: message ?? PhoneNumberErrorMessages.invalid(label, region),
    }),
  );

  if (min !== undefined && max !== undefined) {
    decorators.push(
      Length(min, max, {
        message:
          lengthMessage ??
          PhoneNumberErrorMessages.rangeLength(label, min, max),
      }),
    );
  } else if (min !== undefined) {
    decorators.push(
      MinLength(min, {
        message:
          lengthMessage ?? PhoneNumberErrorMessages.minLength(label, min),
      }),
    );
  } else if (max !== undefined) {
    decorators.push(
      MaxLength(max, {
        message:
          lengthMessage ?? PhoneNumberErrorMessages.maxLength(label, max),
      }),
    );
  }

  return applyDecorators(...decorators);
}
