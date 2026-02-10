import { ValidateBoolean } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface BooleanFieldOptions {
  required?: boolean;
  example?: boolean;
}

/**
 * Helper decorator for boolean fields in DTOs
 *
 * @example
 * @BooleanField('Root Only', { required: false })
 * rootOnly?: boolean;
 */
export function BooleanField(
  label: string,
  opts?: BooleanFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const example = opts?.example ?? true;

  const apiConfig = {
    description: label,
    example,
  };

  return applyDecorators(
    required
      ? ApiProperty({ ...apiConfig, required: true })
      : ApiPropertyOptional({ ...apiConfig, required: false }),
    ValidateBoolean({
      label,
      optional: !required,
    }),
  );
}
