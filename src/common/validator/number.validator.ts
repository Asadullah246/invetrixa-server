import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsNegative,
  IsInt,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Configuration options for custom validation messages.
 */
interface ValidationMessageOptions {
  readonly typeMessage?: string;
  readonly emptyMessage?: string;
  readonly rangeMessage?: string;
  readonly minMessage?: string;
  readonly maxMessage?: string;
  readonly positiveMessage?: string;
  readonly negativeMessage?: string;
  readonly integerMessage?: string;
  readonly notZeroMessage?: string;
}

/**
 * Complete configuration options for number field validation.
 */
interface NumberValidatorOptions {
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly positive?: boolean;
  readonly negative?: boolean;
  readonly integer?: boolean;
  readonly notZero?: boolean;
  readonly optional?: boolean;
  readonly messageOptions?: ValidationMessageOptions;
}

/**
 * Logger instance for enhanced development experience.
 */
const logger = new Logger('NumberValidator');

/**
 * Default error message generators for number validation.
 */
export const NumberErrorMessages = {
  type: (label: string): string => `${label} must be a valid number`,
  empty: (label: string): string => `${label} cannot be empty`,
  minValue: (label: string, min: number): string =>
    `${label} must be greater than or equal to ${min}`,
  maxValue: (label: string, max: number): string =>
    `${label} must be less than or equal to ${max}`,
  range: (label: string, min: number, max: number): string =>
    `${label} must be between ${min} and ${max}`,
  positive: (label: string): string => `${label} must be a positive number`,
  negative: (label: string): string => `${label} must be a negative number`,
  integer: (label: string): string => `${label} must be an integer value`,
  notZero: (label: string): string => `${label} cannot be zero`,
} as const;

/**
 * Transforms values to number and handles various input formats.
 */
const numberTransformer = Transform(
  ({ value }: TransformFnParams): number | string | null | undefined => {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return Number(value);
      }
      const converted = Number(trimmed);
      return isNaN(converted) ? value : converted;
    }

    const converted = Number(value);
    return isNaN(converted) ? value : converted;
  },
);

/**
 * Custom validator for non-zero check.
 * @param validationOptions - Optional validation options
 * @returns A property decorator that validates the value is not zero
 */
function IsNotZero(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isNotZero',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'number' && value !== 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be zero`;
        },
      },
    });
  };
}

/**
 * Universal number field validator with comprehensive validation options.
 *
 * This decorator handles all number validation scenarios:
 * - Min value only
 * - Max value only
 * - Range (min and max)
 * - Positive numbers
 * - Negative numbers
 * - Integer validation
 * - Non-zero validation
 * - Optional fields
 * - Custom error messages
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required number
 * ```
 * @ValidateNumber({
 *   label: 'Age'
 * })
 * age: number;
 * ```
 *
 * @example Optional number with min/max range
 * ```
 * @ValidateNumber({
 *   label: 'Score',
 *   min: 0,
 *   max: 100,
 *   optional: true
 * })
 * score?: number;
 * ```
 *
 * @example Positive integer only
 * ```
 * @ValidateNumber({
 *   label: 'Count',
 *   positive: true,
 *   integer: true
 * })
 * count: number;
 * ```
 *
 * @example Non-zero number with custom message
 * ```
 * @ValidateNumber({
 *   label: 'Multiplier',
 *   notZero: true,
 *   messageOptions: {
 *     notZeroMessage: 'Multiplier must not be zero'
 *   }
 * })
 * multiplier: number;
 * ```
 */
export function ValidateNumber(
  options: NumberValidatorOptions,
): PropertyDecorator {
  const {
    label,
    min,
    max,
    positive = false,
    negative = false,
    integer = false,
    notZero = false,
    optional = false,
    messageOptions,
  } = options;

  if (min !== undefined && min < 0) {
    logger.error(`min length cannot be negative (${min})`);
  }
  if (max !== undefined && max < 0) {
    logger.error(`max length cannot be negative (${max})`);
  }
  if (min !== undefined && max !== undefined && min > max) {
    logger.error(`min length (${min}) cannot exceed max length (${max})`);
  }

  const decorators: PropertyDecorator[] = [numberTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  decorators.push(
    IsNumber(
      {},
      {
        message: messageOptions?.typeMessage ?? NumberErrorMessages.type(label),
      },
    ),
  );

  if (!optional) {
    decorators.push(
      IsNotEmpty({
        message:
          messageOptions?.emptyMessage ?? NumberErrorMessages.empty(label),
      }),
    );
  }

  if (integer) {
    decorators.push(
      IsInt({
        message:
          messageOptions?.integerMessage ?? NumberErrorMessages.integer(label),
      }),
    );
  }

  if (positive && !negative) {
    decorators.push(
      IsPositive({
        message:
          messageOptions?.positiveMessage ??
          NumberErrorMessages.positive(label),
      }),
    );
  } else if (negative && !positive) {
    decorators.push(
      IsNegative({
        message:
          messageOptions?.negativeMessage ??
          NumberErrorMessages.negative(label),
      }),
    );
  }

  if (min !== undefined && max !== undefined) {
    decorators.push(
      Min(min, {
        message:
          messageOptions?.rangeMessage ??
          messageOptions?.minMessage ??
          NumberErrorMessages.range(label, min, max),
      }),
    );
    decorators.push(
      Max(max, {
        message:
          messageOptions?.rangeMessage ??
          messageOptions?.maxMessage ??
          NumberErrorMessages.range(label, min, max),
      }),
    );
  } else if (min !== undefined) {
    decorators.push(
      Min(min, {
        message:
          messageOptions?.minMessage ??
          NumberErrorMessages.minValue(label, min),
      }),
    );
  } else if (max !== undefined) {
    decorators.push(
      Max(max, {
        message:
          messageOptions?.maxMessage ??
          NumberErrorMessages.maxValue(label, max),
      }),
    );
  }

  if (notZero) {
    decorators.push(
      IsNotZero({
        message:
          messageOptions?.notZeroMessage ?? NumberErrorMessages.notZero(label),
      }),
    );
  }

  return applyDecorators(...decorators);
}
