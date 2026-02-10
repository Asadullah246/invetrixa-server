import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  Length,
  ValidationOptions,
} from 'class-validator';

/**
 * Configuration options for email validation.
 * Supports all class-validator IsEmail options.
 */
export interface EmailValidationOptions {
  readonly allowDisplayName?: boolean;
  readonly requireDisplayName?: boolean;
  readonly allowUtf8LocalPart?: boolean;
  readonly requireTld?: boolean;
  readonly allowIpDomain?: boolean;
  readonly domainSpecificValidation?: boolean;
  readonly blacklistedChars?: string;
  readonly hostBlacklist?: string[];
  readonly hostWhitelist?: string[];
}

/**
 * Configuration options for email field validation.
 */
export interface EmailValidatorOptions {
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly optional?: boolean;
  readonly emailOptions?: EmailValidationOptions;
  readonly message?: string;
  readonly lengthMessage?: string;
}

/**
 * Logger instance for enhanced development experience.
 */
const logger = new Logger('EmailValidator');

/**
 * Default error message generators for email validation.
 */
const EmailErrorMessages = {
  email: (label: string): string => `${label} is not a valid email address`,
  minLength: (label: string, min: number): string =>
    `${label} should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} should not exceed ${max} characters`,
  rangeLength: (label: string, min: number, max: number): string =>
    `${label} should be between ${min} and ${max} characters long`,
} as const;

/**
 * Transforms string values by trimming whitespace and converting to lowercase.
 */
const emailTransformer = Transform(({ value }: TransformFnParams): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : value,
);

/**
 * Maps camelCase email options to snake_case validator options.
 * @param emailOptions - Email validation options in camelCase
 * @returns Mapped options in snake_case format for class-validator
 */
function mapEmailOptions(
  emailOptions: EmailValidationOptions,
): Record<string, any> {
  const mapped: Record<string, any> = {};

  if (emailOptions.allowDisplayName !== undefined) {
    mapped.allow_display_name = emailOptions.allowDisplayName;
  }
  if (emailOptions.requireDisplayName !== undefined) {
    mapped.require_display_name = emailOptions.requireDisplayName;
  }
  if (emailOptions.allowUtf8LocalPart !== undefined) {
    mapped.allow_utf8_local_part = emailOptions.allowUtf8LocalPart;
  }
  if (emailOptions.requireTld !== undefined) {
    mapped.require_tld = emailOptions.requireTld;
  }
  if (emailOptions.allowIpDomain !== undefined) {
    mapped.allow_ip_domain = emailOptions.allowIpDomain;
  }
  if (emailOptions.domainSpecificValidation !== undefined) {
    mapped.domain_specific_validation = emailOptions.domainSpecificValidation;
  }
  if (emailOptions.blacklistedChars !== undefined) {
    mapped.blacklisted_chars = emailOptions.blacklistedChars;
  }
  if (emailOptions.hostBlacklist !== undefined) {
    mapped.host_blacklist = emailOptions.hostBlacklist;
  }
  if (emailOptions.hostWhitelist !== undefined) {
    mapped.host_whitelist = emailOptions.hostWhitelist;
  }

  return mapped;
}

/**
 * Universal email field validator with comprehensive validation options.
 *
 * Supports all class-validator IsEmail options including:
 * - Display name support ("John Doe" <john@example.com>)
 * - UTF-8 local part (unicode characters before @)
 * - TLD (Top Level Domain) requirement
 * - IP domain allowance
 * - Domain-specific validation
 * - Character blacklisting
 * - Host whitelist/blacklist
 * - Length constraints (min, max, range)
 * - Optional/Required field control
 * - Automatic lowercase conversion
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required email
 * ```
 * @ValidateEmail({ label: 'Email' })
 * email: string;
 * ```
 *
 * @example Optional email with length constraints
 * ```
 * @ValidateEmail({
 *   label: 'Contact Email',
 *   optional: true,
 *   min: 5,
 *   max: 100
 * })
 * contactEmail?: string;
 * ```
 *
 * @example Email with custom validation options
 * ```
 * @ValidateEmail({
 *   label: 'Business Email',
 *   emailOptions: {
 *     requireTld: true,
 *     hostWhitelist: ['company.com', 'business.com']
 *   }
 * })
 * businessEmail: string;
 * ```
 */
export function ValidateEmail(
  options: EmailValidatorOptions,
): PropertyDecorator {
  const {
    label,
    min,
    max,
    optional = false,
    emailOptions,
    message,
    lengthMessage,
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

  const decorators: PropertyDecorator[] = [emailTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  const emailOpts: Record<string, any> = emailOptions
    ? mapEmailOptions(emailOptions)
    : {};

  const validatorOptions: ValidationOptions = {
    message: message ?? EmailErrorMessages.email(label),
  };

  decorators.push(IsEmail(emailOpts, validatorOptions));

  if (min !== undefined && max !== undefined) {
    decorators.push(
      Length(min, max, {
        message:
          lengthMessage ?? EmailErrorMessages.rangeLength(label, min, max),
      }),
    );
  } else if (min !== undefined) {
    decorators.push(
      MinLength(min, {
        message: lengthMessage ?? EmailErrorMessages.minLength(label, min),
      }),
    );
  } else if (max !== undefined) {
    decorators.push(
      MaxLength(max, {
        message: lengthMessage ?? EmailErrorMessages.maxLength(label, max),
      }),
    );
  }

  return applyDecorators(...decorators);
}
