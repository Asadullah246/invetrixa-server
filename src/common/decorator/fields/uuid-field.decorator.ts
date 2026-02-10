import { ValidateUUID } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface UUIDFieldOptions {
  required?: boolean;
  example?: string;
}

/**
 * Helper decorator for UUID fields in DTOs
 *
 * @example
 * @UUIDField('Parent Category ID', { required: false })
 * parentId?: string;
 */
export function UUIDField(
  label: string,
  opts?: UUIDFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const example = opts?.example ?? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  const apiConfig = {
    description: label,
    example,
  };

  return applyDecorators(
    required
      ? ApiProperty({ ...apiConfig, required: true })
      : ApiPropertyOptional({ ...apiConfig, required: false }),
    ValidateUUID({
      label,
      optional: !required,
    }),
  );
}
