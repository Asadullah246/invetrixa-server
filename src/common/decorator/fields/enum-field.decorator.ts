import { ValidateEnum } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';

interface EnumFieldOptions {
  required?: boolean;
  isArray?: boolean; // if true, expects an array of enum values
}

/**
 * Helper decorator for enum fields (single or multiple)
 * Supports both single enum values and arrays of enum values
 */

// example usage of EnumField decorator

//  @EnumField('Features', Feature, { isArray: true, required: false })
// features?: Feature[];

export function EnumField<T extends Record<string, string | number>>(
  label: string,
  enumObj: T,
  opts?: EnumFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const isArray = opts?.isArray ?? false;

  const decorators: PropertyDecorator[] = [
    ApiProperty({
      description: label,
      enum: Object.values(enumObj),
      required,
      isArray,
      example: isArray
        ? [Object.values(enumObj)[0]]
        : Object.values(enumObj)[0],
    }),
  ];

  if (isArray) {
    // For arrays, we need to validate the array itself and each element
    decorators.push(IsArray({ message: `${label} must be an array` }));

    if (required) {
      decorators.push(
        ArrayNotEmpty({ message: `${label} should not be empty` }),
      );
    }

    // Validate each element in the array is a valid enum value
    decorators.push(
      IsEnum(enumObj, {
        each: true,
        message: `Each value in ${label} must be a valid enum value`,
      }),
    );
  } else {
    // For single values, use the ValidateEnum validator
    decorators.push(
      ValidateEnum({
        label,
        enum: enumObj,
        optional: !required,
      }),
    );
  }

  return applyDecorators(...decorators);
}
