import { ValidateString } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface StringFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  example?: string; // optional custom example
}

/**
 * Helper decorator for string fields in DTOs
 */
export function StringField(
  label: string,
  opts?: StringFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const min = opts?.min;
  const max = opts?.max;
  const example = opts?.example ?? `${label}`;

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
    ValidateString({
      label,
      min,
      max,
      optional: !required,
    }),
  );
}
