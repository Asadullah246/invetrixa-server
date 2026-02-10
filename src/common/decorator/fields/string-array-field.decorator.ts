import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

interface ArrayFieldOptions {
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  example?: string[];
}

/**
 * Helper decorator for string array fields in DTOs
 */
export function StringArrayField(
  label: string,
  opts?: ArrayFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const minItems = opts?.minItems;
  const maxItems = opts?.maxItems;
  const example = opts?.example ?? [`${label} item`];

  const apiPropertyConfig: Record<string, any> = {
    description: label,
    type: [String],
    example,
  };

  // Only add minItems/maxItems if they are defined
  if (minItems !== undefined) {
    apiPropertyConfig.minItems = minItems;
  }
  if (maxItems !== undefined) {
    apiPropertyConfig.maxItems = maxItems;
  }

  const validators: PropertyDecorator[] = [
    IsArray({ message: `${label} must be an array` }),
    IsString({
      each: true,
      message: `Each item in ${label} must be a string`,
    }),
  ];

  if (!required) {
    validators.push(IsOptional());
  } else {
    validators.push(IsNotEmpty({ message: `${label} is required` }));
  }

  if (minItems !== undefined) {
    validators.push(
      ArrayMinSize(minItems, {
        message: `${label} must have at least ${minItems} items`,
      }),
    );
  }

  if (maxItems !== undefined) {
    validators.push(
      ArrayMaxSize(maxItems, {
        message: `${label} must have at most ${maxItems} items`,
      }),
    );
  }

  return applyDecorators(
    required
      ? ApiProperty({ ...apiPropertyConfig, required: true })
      : ApiPropertyOptional({ ...apiPropertyConfig, required: false }),
    ...validators,
  );
}
