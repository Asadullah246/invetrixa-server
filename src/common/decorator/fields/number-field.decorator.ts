import { ValidateNumber } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface NumberFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  positive?: boolean;
  negative?: boolean;
  integer?: boolean;
  notZero?: boolean;
  example?: number;
}

/**
 * Helper decorator for number fields in DTOs
 */
export function NumberField(
  label: string,
  opts?: NumberFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;

  const apiConfig = {
    description: label,
    minimum: opts?.min,
    maximum: opts?.max,
    example: opts?.example ?? 0,
  };

  const decorators: PropertyDecorator[] = [
    required
      ? ApiProperty({ ...apiConfig, required: true })
      : ApiPropertyOptional({ ...apiConfig, required: false }),
    ValidateNumber({
      label,
      min: opts?.min,
      max: opts?.max,
      positive: opts?.positive,
      negative: opts?.negative,
      integer: opts?.integer,
      notZero: opts?.notZero,
      optional: !required,
    }),
  ];

  return applyDecorators(...decorators);
}
