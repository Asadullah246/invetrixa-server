import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

interface ValidationMessageOptions {
  readonly typeMessage?: string;
  readonly emptyMessage?: string;
  readonly lengthMessage?: string;
}

interface StringValidatorOptions {
  readonly label?: string; // now optional — auto fallback to property name
  readonly min?: number;
  readonly max?: number;
  readonly optional?: boolean;
  readonly messageOptions?: ValidationMessageOptions;
}

const logger = new Logger('StringValidator');

const ErrorMessages = {
  type: (label: string): string => `${label} should be a string`,
  empty: (label: string): string => `${label} should not be empty`,
  minLength: (label: string, min: number): string =>
    `${label} should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} should not exceed ${max} characters`,
  rangeLength: (label: string, min: number, max: number): string =>
    `${label} should be between ${min} and ${max} characters long`,
} as const;

/**
 * Trims input and converts "" → undefined for optional fields
 */

const normalizeString = Transform(({ value }: TransformFnParams) => {
  if (typeof value !== 'string') return value as unknown as string | undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;

  // if (typeof value !== 'string') {
  //   throw new BadRequestException(`${value ?? 'Value'} must be a string`);
  // }

  // const trimmed = value.trim();
  // return trimmed === '' ? undefined : trimmed;
});

export function ValidateString(
  options: StringValidatorOptions,
): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const label = options.label ?? String(propertyKey);
    const { min, max, optional = false, messageOptions } = options;

    if (min !== undefined && min < 0)
      logger.error(`min length cannot be negative (${min})`);
    if (max !== undefined && max < 0)
      logger.error(`max length cannot be negative (${max})`);
    if (min !== undefined && max !== undefined && min > max)
      logger.error(`min length (${min}) cannot exceed max length (${max})`);

    const decorators: PropertyDecorator[] = [normalizeString];

    if (optional) {
      decorators.push(IsOptional());
    }

    decorators.push(
      IsString({
        message: messageOptions?.typeMessage ?? ErrorMessages.type(label),
      }),
    );

    if (!optional) {
      decorators.push(
        IsNotEmpty({
          message: messageOptions?.emptyMessage ?? ErrorMessages.empty(label),
        }),
      );
    }

    if (min !== undefined && max !== undefined) {
      decorators.push(
        Length(min, max, {
          message:
            messageOptions?.lengthMessage ??
            ErrorMessages.rangeLength(label, min, max),
        }),
      );
    } else if (min !== undefined) {
      decorators.push(
        MinLength(min, {
          message:
            messageOptions?.lengthMessage ??
            ErrorMessages.minLength(label, min),
        }),
      );
    } else if (max !== undefined) {
      decorators.push(
        MaxLength(max, {
          message:
            messageOptions?.lengthMessage ??
            ErrorMessages.maxLength(label, max),
        }),
      );
    }

    return applyDecorators(...decorators)(target, propertyKey);
  };
}
