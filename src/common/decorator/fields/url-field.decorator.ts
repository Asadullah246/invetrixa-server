import { UrlValidatorOptions, ValidateUrl } from '@/common/validator';
import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// usage example:
//  @UrlField('Logo URL', {
//     required: false,
//     max: 255,
//     urlOptions: { protocols: ['https', 'ftp'], requireProtocol: true },
//   })

interface UrlFieldOptions {
  required?: boolean;
  min?: number;
  max?: number;
  urlOptions?: UrlValidatorOptions['urlOptions'];
  example?: string;
}

// Default URL constraints
const DEFAULT_URL_CONSTRAINTS = {
  min: 10,
  max: 2048,
} as const;

// Default URL validation options
const DEFAULT_URL_OPTIONS: UrlValidatorOptions['urlOptions'] = {
  requireProtocol: true,
  protocols: ['http', 'https', 'ftp'],
  requireTld: true,
};

/**
 * Helper decorator for URL fields in DTOs
 */
export function UrlField(
  label: string,
  opts?: UrlFieldOptions,
): PropertyDecorator {
  const required = opts?.required ?? true;
  const min = opts?.min ?? DEFAULT_URL_CONSTRAINTS.min;
  const max = opts?.max ?? DEFAULT_URL_CONSTRAINTS.max;
  const urlOptions = opts?.urlOptions ?? DEFAULT_URL_OPTIONS;
  const example =
    opts?.example ??
    `https://example.com/${label.replace(/\s+/g, '-').toLowerCase()}`;

  const apiConfig = {
    description: label,
    minLength: min,
    maxLength: max,
    example,
  };

  return applyDecorators(
    required
      ? ApiProperty({ ...apiConfig, required: true })
      : ApiPropertyOptional({ ...apiConfig, required: false }),
    ValidateUrl({
      label,
      min,
      max,
      optional: !required,
      urlOptions,
    }),
  );
}
