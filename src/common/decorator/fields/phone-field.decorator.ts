import { ValidatePhoneNumber } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryCode } from 'libphonenumber-js';

// Default phone number constraints
const DEFAULT_PHONE_CONSTRAINTS = {
  min: 6, // Minimum length for a valid phone number
  max: 20, // Maximum length for a valid phone number
} as const;

interface PhoneFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  example?: string; // optional custom example
  region?: CountryCode; // Country code like 'BD', 'US', etc.
}

/**
 * Helper decorator for phone number fields in DTOs
 * Applies intelligent defaults if not provided
 *
 * Defaults:
 * - min: 6 characters
 * - max: 20 characters
 * - required: true
 * - example: '+8801XXXXXXXXX'
 */
export function PhoneField(
  label: string,
  opts?: PhoneFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const min = opts?.min ?? DEFAULT_PHONE_CONSTRAINTS.min;
  const max = opts?.max ?? DEFAULT_PHONE_CONSTRAINTS.max;
  const example = opts?.example ?? '+8801XXXXXXXXX';
  const region = opts?.region;

  const apiPropertyConfig = {
    description: label,
    minLength: min,
    maxLength: max,
    example,
  };

  return applyDecorators(
    required
      ? ApiProperty({ ...apiPropertyConfig, required: true })
      : ApiPropertyOptional({ ...apiPropertyConfig, required: false }),
    ValidatePhoneNumber({
      label,
      min,
      max,
      optional: !required,
      region,
    }),
  );
}
