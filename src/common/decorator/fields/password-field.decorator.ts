import { ValidatePassword } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface PasswordFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  example?: string;
}

/**
 * Helper decorator for password fields in DTOs
 */
export function PasswordField(
  label: string,
  opts?: PasswordFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const min = opts?.min ?? 8;
  const max = opts?.max;
  const example = opts?.example ?? 'Str0ngP@ssw0rd!';

  const apiPropertyConfig = {
    description: label,
    minLength: min,
    maxLength: max,
    example,
    format: 'password',
  };

  return applyDecorators(
    required
      ? ApiProperty({ ...apiPropertyConfig, required: true })
      : ApiPropertyOptional({ ...apiPropertyConfig, required: false }),
    ValidatePassword({
      label,
      min,
      max,
      optional: !required,
    }),
  );
}
