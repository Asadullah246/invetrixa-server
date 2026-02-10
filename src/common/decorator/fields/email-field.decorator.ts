import { ValidateEmail } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Default email constraints - extracted from Prisma schema
const DEFAULT_EMAIL_CONSTRAINTS = {
  min: 5, // Minimum length for valid email (a@b.c)
  max: 255, // Maximum length for email field
} as const;

interface EmailFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  example?: string; // Optional custom example
}

/**
 * Helper decorator for email fields in DTOs
 */
export function EmailField(
  label: string,
  opts?: EmailFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const min = opts?.min ?? DEFAULT_EMAIL_CONSTRAINTS.min;
  const max = opts?.max ?? DEFAULT_EMAIL_CONSTRAINTS.max;
  const example = opts?.example ?? 'example@email.com';

  const apiPropertyConfig = {
    description: label,
    minLength: min,
    maxLength: max,
    example,
  };

  return applyDecorators(
    required
      ? ApiProperty({
          ...apiPropertyConfig,
          required: true,
        })
      : ApiPropertyOptional({
          ...apiPropertyConfig,
          required: false,
        }),
    ValidateEmail({
      label,
      min,
      max,
      optional: !required,
    }),
  );
}
