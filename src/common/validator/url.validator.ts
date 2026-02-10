import { applyDecorators, Logger } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
  Length,
  ValidationOptions,
} from 'class-validator';

/**
 * Configuration options for URL validation.
 * Supports all class-validator IsUrl options.
 */
interface UrlValidationOptions {
  readonly protocols?: string[];
  readonly requireProtocol?: boolean;
  readonly requireTld?: boolean;
  readonly requireHost?: boolean;
  readonly requireValidProtocol?: boolean;
  readonly allowUnderscores?: boolean;
  readonly allowTrailingDot?: boolean;
  readonly allowProtocolRelativeUrls?: boolean;
  readonly allowFragments?: boolean;
  readonly allowQueryComponents?: boolean;
  readonly disallowAuth?: boolean;
  readonly hostWhitelist?: (string | RegExp)[];
  readonly hostBlacklist?: (string | RegExp)[];
  readonly validateLength?: boolean;
}

/**
 * Configuration options for URL field validation.
 */
export interface UrlValidatorOptions {
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly optional?: boolean;
  readonly urlOptions?: UrlValidationOptions;
  readonly message?: string;
  readonly lengthMessage?: string;
}

/**
 * Logger instance for enhanced development experience.
 */
const logger = new Logger('UrlValidator');

/**
 * Default error message generators for URL validation.
 */
const UrlErrorMessages = {
  url: (label: string): string => `${label} is not a valid URL`,
  minLength: (label: string, min: number): string =>
    `${label} should be at least ${min} characters long`,
  maxLength: (label: string, max: number): string =>
    `${label} should not exceed ${max} characters`,
  rangeLength: (label: string, min: number, max: number): string =>
    `${label} should be between ${min} and ${max} characters long`,
} as const;

/**
 * Transforms string values by trimming whitespace.
 */
const trimTransformer = Transform(({ value }: TransformFnParams): string =>
  typeof value === 'string' ? value.trim() : value,
);

/**
 * Maps camelCase URL options to snake_case validator options.
 * @param urlOptions - URL validation options in camelCase
 * @returns Mapped options in snake_case format for class-validator
 */
function mapUrlOptions(urlOptions: UrlValidationOptions): Record<string, any> {
  const mapped: Record<string, any> = {};

  if (urlOptions.protocols !== undefined) {
    mapped.protocols = urlOptions.protocols;
  }
  if (urlOptions.requireProtocol !== undefined) {
    mapped.require_protocol = urlOptions.requireProtocol;
  }
  if (urlOptions.requireTld !== undefined) {
    mapped.require_tld = urlOptions.requireTld;
  }
  if (urlOptions.requireHost !== undefined) {
    mapped.require_host = urlOptions.requireHost;
  }
  if (urlOptions.requireValidProtocol !== undefined) {
    mapped.require_valid_protocol = urlOptions.requireValidProtocol;
  }
  if (urlOptions.allowUnderscores !== undefined) {
    mapped.allow_underscores = urlOptions.allowUnderscores;
  }
  if (urlOptions.allowTrailingDot !== undefined) {
    mapped.allow_trailing_dot = urlOptions.allowTrailingDot;
  }
  if (urlOptions.allowProtocolRelativeUrls !== undefined) {
    mapped.allow_protocol_relative_urls = urlOptions.allowProtocolRelativeUrls;
  }
  if (urlOptions.allowFragments !== undefined) {
    mapped.allow_fragments = urlOptions.allowFragments;
  }
  if (urlOptions.allowQueryComponents !== undefined) {
    mapped.allow_query_components = urlOptions.allowQueryComponents;
  }
  if (urlOptions.disallowAuth !== undefined) {
    mapped.disallow_auth = urlOptions.disallowAuth;
  }
  if (urlOptions.hostWhitelist !== undefined) {
    mapped.host_whitelist = urlOptions.hostWhitelist;
  }
  if (urlOptions.hostBlacklist !== undefined) {
    mapped.host_blacklist = urlOptions.hostBlacklist;
  }
  if (urlOptions.validateLength !== undefined) {
    mapped.validate_length = urlOptions.validateLength;
  }

  return mapped;
}

/**
 * Universal URL field validator with comprehensive validation options.
 *
 * Supports all class-validator IsUrl options including:
 * - Protocol restrictions (http, https, ftp, ws, wss, etc.)
 * - Protocol requirement enforcement
 * - TLD (Top Level Domain) validation
 * - Host validation and whitelist/blacklist
 * - Underscore, trailing dots, auth components
 * - Fragment and query component control
 * - Length constraints (min, max, range)
 * - Optional/Required field control
 *
 * @param options - Complete configuration object
 * @returns A property decorator that applies all configured validations
 *
 * @example Basic required URL
 * ```
 * @ValidateUrl({
 *   label: 'Website'
 * })
 * website: string;
 * ```
 *
 * @example Optional URL with HTTPS-only
 * ```
 * @ValidateUrl({
 *   label: 'Logo URL',
 *   optional: true,
 *   max: 255,
 *   urlOptions: {
 *     protocols: ['https'],
 *     requireProtocol: true
 *   }
 * })
 * logo?: string;
 * ```
 *
 * @example URL with host whitelist
 * ```
 * @ValidateUrl({
 *   label: 'Social Media',
 *   optional: true,
 *   urlOptions: {
 *     hostWhitelist: ['twitter.com', 'facebook.com', 'linkedin.com'],
 *     allowQueryComponents: true
 *   }
 * })
 * socialMedia?: string;
 * ```
 *
 * @example WebSocket URL
 * ```
 * @ValidateUrl({
 *   label: 'WebSocket URL',
 *   urlOptions: {
 *     protocols: ['ws', 'wss'],
 *     requireProtocol: true
 *   }
 * })
 * websocketUrl: string;
 * ```
 */
export function ValidateUrl(options: UrlValidatorOptions): PropertyDecorator {
  const {
    label,
    min,
    max,
    optional = false,
    urlOptions,
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

  const decorators: PropertyDecorator[] = [trimTransformer];

  if (optional) {
    decorators.push(IsOptional());
  }

  const urlValidationOptions: Record<string, any> = {};

  if (urlOptions) {
    Object.assign(urlValidationOptions, mapUrlOptions(urlOptions));
  }

  const validationOptions: ValidationOptions = {
    message: message ?? UrlErrorMessages.url(label),
  };

  decorators.push(IsUrl(urlValidationOptions, validationOptions));

  if (min !== undefined && max !== undefined) {
    decorators.push(
      Length(min, max, {
        message: lengthMessage ?? UrlErrorMessages.rangeLength(label, min, max),
      }),
    );
  } else if (min !== undefined) {
    decorators.push(
      MinLength(min, {
        message: lengthMessage ?? UrlErrorMessages.minLength(label, min),
      }),
    );
  } else if (max !== undefined) {
    decorators.push(
      MaxLength(max, {
        message: lengthMessage ?? UrlErrorMessages.maxLength(label, max),
      }),
    );
  }

  return applyDecorators(...decorators);
}
