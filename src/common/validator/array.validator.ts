import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  IsBoolean,
  MaxLength,
  MinLength,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  ValidationOptions,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';

/**
 * Type map for built-in array item types.
 * Maps type names to their corresponding TypeScript types.
 */
type ArrayItemTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

/**
 * Built-in array item types that are supported natively.
 * Can be 'string', 'number', or 'boolean'.
 */
type BuiltInArrayItemType = keyof ArrayItemTypeMap;

/**
 * Custom class type for complex objects.
 * Represents a constructor function that can be instantiated.
 * @template T - The type of the class instance
 */
type CustomClassType<T = any> = new (...args: any[]) => T;

/**
 * Custom validation function for generic types.
 * @param value - The value to validate
 * @param args - Validation arguments from class-validator
 * @returns True if valid, false otherwise (can be async)
 */
type CustomValidatorFn = (
  value: any,
  args: ValidationArguments,
) => boolean | Promise<boolean>;

/**
 * All supported array item types.
 * Can be a built-in type, a custom class, or 'custom' for generic validation.
 */
type ArrayItemType = BuiltInArrayItemType | CustomClassType | 'custom';

/**
 * Base configuration options for array validation.
 * Contains common options shared across all array validator types.
 */
interface BaseArrayValidatorOptions {
  readonly label: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly optional?: boolean;
  readonly message?: string;
  readonly itemTypeMessage?: string;
  readonly itemLengthMessage?: string;
  readonly arraySizeMessage?: string;
  readonly customValidators?: PropertyDecorator[];
}

/**
 * Options for built-in types (string, number, boolean).
 * Extends base options with specific item type constraint.
 */
interface BuiltInArrayValidatorOptions extends BaseArrayValidatorOptions {
  readonly itemType: BuiltInArrayItemType;
}

/**
 * Options for custom class types.
 * Allows validation of complex objects using DTO classes.
 * @template T - The type of the custom class
 */
interface CustomClassArrayValidatorOptions<
  T = any,
> extends BaseArrayValidatorOptions {
  readonly itemType: CustomClassType<T>;
  readonly validationOptions?: ValidationOptions;
}

/**
 * Options for completely custom validation.
 * Provides maximum flexibility with custom validator functions and transformers.
 */
interface GenericArrayValidatorOptions extends BaseArrayValidatorOptions {
  readonly itemType: 'custom';
  readonly itemValidator?: CustomValidatorFn;
  readonly transform?: (value: any) => any;
}

/**
 * Combined options type for array validation.
 * Union of all possible validator option types.
 */
type ArrayValidatorOptions =
  | BuiltInArrayValidatorOptions
  | CustomClassArrayValidatorOptions
  | GenericArrayValidatorOptions;

/**
 * Default error message generators for array validation.
 * Provides consistent, user-friendly error messages.
 */
const ArrayErrorMessages = {
  array: (label: string): string => `${label} should be an array`,
  string: (label: string): string => `${label} items should be strings`,
  number: (label: string): string => `${label} items should be numbers`,
  boolean: (label: string): string => `${label} items should be booleans`,
  custom: (label: string): string => `${label} items have invalid format`,
  minLength: (label: string, min: number): string =>
    `${label} items should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} items should not exceed ${max} characters`,
  minSize: (label: string, min: number): string =>
    `${label} should contain at least ${min} items`,
  maxSize: (label: string, max: number): string =>
    `${label} should not contain more than ${max} items`,
} as const;

/**
 * Type guard to check if itemType is a built-in type.
 * @param itemType - The item type to check
 * @returns True if the item type is 'string', 'number', or 'boolean'
 */
function isBuiltInType(
  itemType: ArrayItemType,
): itemType is BuiltInArrayItemType {
  return (
    typeof itemType === 'string' &&
    ['string', 'number', 'boolean'].includes(itemType)
  );
}

/**
 * Type guard to check if itemType is 'custom'.
 * @param itemType - The item type to check
 * @returns True if the item type is 'custom'
 */
function isCustomType(itemType: ArrayItemType): boolean {
  return itemType === 'custom';
}

/**
 * Creates a transformer that processes array items based on their type.
 * Handles automatic type conversion and custom transformations.
 * @template T - The target type for array items
 * @param itemType - The type of items in the array
 * @param customTransform - Optional custom transformation function
 * @returns A class-transformer decorator that transforms array items
 */
function createArrayTransformer<T = unknown>(
  itemType: ArrayItemType,
  customTransform?: (value: unknown) => T,
) {
  return Transform(({ value }: TransformFnParams): T[] => {
    if (!Array.isArray(value)) {
      return value;
    }

    if (customTransform) {
      return value.map((item, index) => {
        try {
          return customTransform(item);
        } catch (error) {
          console.error(`Transform error for item at index ${index}:`, error);
          return item as unknown as T;
        }
      });
    }

    if (!isBuiltInType(itemType)) {
      return value;
    }

    return value.map((item): unknown => {
      switch (itemType) {
        case 'string':
          return typeof item === 'string' ? item.trim() : item;
        case 'number':
          return typeof item === 'number'
            ? item
            : typeof item === 'string'
              ? Number(item)
              : item;
        case 'boolean':
          return typeof item === 'boolean' ? item : item;
        default:
          return item;
      }
    }) as T[];
  });
}

/**
 * Creates a custom validator decorator for array items.
 * Validates each item in the array using the provided validator function.
 * @param label - The field label for error messages
 * @param validatorFn - The validation function to apply to each item
 * @param message - Optional custom error message
 * @returns A property decorator that validates array items
 */
function createCustomItemValidator(
  label: string,
  validatorFn: CustomValidatorFn,
  message?: string,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'customArrayItemValidator',
      target: object.constructor,
      propertyName: propertyName as string,
      async: true,
      options: {
        message: message ?? ArrayErrorMessages.custom(label),
      },
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return true; // IsArray will handle this
          }

          try {
            // Run all validators and allow them to be sync or async
            const results = await Promise.all(
              value.map((item, index) =>
                Promise.resolve(validatorFn(item, args)).catch((error) => {
                  console.error(
                    `Validation error for ${args.property}[${index}]:`,
                    error,
                  );
                  return false;
                }),
              ),
            );

            return results.every((res) => Boolean(res));
          } catch (error) {
            console.error(`Validation error for ${args.property}:`, error);
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return message ?? ArrayErrorMessages.custom(args.property);
        },
      },
    });
  };
}

/**
 * Universal array field validator with comprehensive validation options.
 *
 * Supports:
 * - Array validation (ensures value is an array)
 * - Item type validation (string, number, boolean, custom class, or generic)
 * - Item length constraints for strings (min, max)
 * - Array size constraints (min/max number of items)
 * - Optional/Required field control
 * - Automatic whitespace trimming for string items
 * - Custom nested object validation
 * - Custom validation functions for any type
 * - Custom transformers for items
 * - Additional custom validators
 *
 * @template T - The type of array items (for custom class validation)
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required string array
 * ```
 * @ValidateArray({ label: 'Tags', itemType: 'string' })
 * tags: string[];
 * ```
 *
 * @example Generic custom validation with validator function
 * ```
 * @ValidateArray({
 *   label: 'User IDs',
 *   itemType: 'custom',
 *   itemValidator: (value) => {
 *     return typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
 *   },
 *   itemTypeMessage: 'User IDs must be lowercase alphanumeric with hyphens'
 * })
 * userIds: string[];
 * ```
 *
 * @example Custom type with transform and validation
 * ```
 * @ValidateArray({
 *   label: 'Timestamps',
 *   itemType: 'custom',
 *   transform: (value) => new Date(value),
 *   itemValidator: (value) => value instanceof Date && !isNaN(value.getTime()),
 *   itemTypeMessage: 'Invalid timestamp format'
 * })
 * timestamps: Date[];
 * ```
 *
 * @example Enum validation
 * ```
 * enum UserRole {
 *   ADMIN = 'admin',
 *   USER = 'user'
 * }
 *
 * @ValidateArray({
 *   label: 'Roles',
 *   itemType: 'custom',
 *   itemValidator: (value) => Object.values(UserRole).includes(value),
 *   itemTypeMessage: 'Invalid role'
 * })
 * roles: UserRole[];
 * ```
 *
 * @example Custom class with nested validation
 * ```
 * class AddressDto {
 *   @IsString()
 *   street: string;
 *
 *   @IsString()
 *   city: string;
 * }
 *
 * @ValidateArray({
 *   label: 'Addresses',
 *   itemType: AddressDto,
 *   minSize: 1,
 *   maxSize: 5
 * })
 * addresses: AddressDto[];
 * ```
 */
export function ValidateArray<T = any>(
  options: ArrayValidatorOptions,
): PropertyDecorator {
  const {
    label,
    itemType,
    minLength,
    maxLength,
    minSize,
    maxSize,
    optional = false,
    message,
    itemTypeMessage,
    itemLengthMessage,
    arraySizeMessage,
    customValidators = [],
  } = options;

  const decorators: PropertyDecorator[] = [];

  if (optional) {
    decorators.push(IsOptional());
  }

  decorators.push(
    IsArray({
      message: message ?? ArrayErrorMessages.array(label),
    }),
  );

  if (isCustomType(itemType)) {
    const customOptions = options as GenericArrayValidatorOptions;

    if (customOptions.transform) {
      decorators.push(
        createArrayTransformer(itemType, customOptions.transform),
      );
    }

    if (customOptions.itemValidator) {
      decorators.push(
        createCustomItemValidator(
          label,
          customOptions.itemValidator,
          itemTypeMessage,
        ),
      );
    }
  } else if (isBuiltInType(itemType)) {
    decorators.push(createArrayTransformer(itemType));

    switch (itemType) {
      case 'string':
        decorators.push(
          IsString({
            each: true,
            message: itemTypeMessage ?? ArrayErrorMessages.string(label),
          }),
        );

        if (minLength !== undefined && maxLength !== undefined) {
          decorators.push(
            Length(minLength, maxLength, {
              each: true,
              message:
                itemLengthMessage ??
                `${label} items should be between ${minLength} and ${maxLength} characters long`,
            }),
          );
        } else if (minLength !== undefined) {
          decorators.push(
            MinLength(minLength, {
              each: true,
              message:
                itemLengthMessage ??
                ArrayErrorMessages.minLength(label, minLength),
            }),
          );
        } else if (maxLength !== undefined) {
          decorators.push(
            MaxLength(maxLength, {
              each: true,
              message:
                itemLengthMessage ??
                ArrayErrorMessages.maxLength(label, maxLength),
            }),
          );
        }
        break;

      case 'number':
        decorators.push(
          IsNumber(
            {},
            {
              each: true,
              message: itemTypeMessage ?? ArrayErrorMessages.number(label),
            },
          ),
        );
        break;

      case 'boolean':
        decorators.push(
          IsBoolean({
            each: true,
            message: itemTypeMessage ?? ArrayErrorMessages.boolean(label),
          }),
        );
        break;
    }
  } else {
    const customClassOptions = options as CustomClassArrayValidatorOptions<T>;

    decorators.push(
      ValidateNested({
        each: true,
        message: itemTypeMessage ?? ArrayErrorMessages.custom(label),
        ...customClassOptions.validationOptions,
      }),
    );

    decorators.push(Type(() => itemType as CustomClassType<T>));
  }

  if (customValidators.length > 0) {
    decorators.push(...customValidators);
  }

  if (minSize !== undefined) {
    decorators.push(
      ArrayMinSize(minSize, {
        message: arraySizeMessage ?? ArrayErrorMessages.minSize(label, minSize),
      }),
    );
  }

  if (maxSize !== undefined) {
    decorators.push(
      ArrayMaxSize(maxSize, {
        message: arraySizeMessage ?? ArrayErrorMessages.maxSize(label, maxSize),
      }),
    );
  }

  return applyDecorators(...decorators);
}
