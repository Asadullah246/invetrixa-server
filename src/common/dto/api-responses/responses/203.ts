import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiResponse, ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { SuccessProperties } from '../types/success-response';

export const ApiResponseNonAuthoritativeInformation = (
  options: SuccessProperties,
) => {
  const {
    message = 'Non-Authoritative Information',
    description = 'Non-Authoritative Information',
    type,
    meta = null,
  } = options;

  class NonAuthoritativeInformationResponse {
    @ApiProperty({
      example: true,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 203,
      description: 'The HTTP status code.',
    })
    statusCode: number;

    @ApiProperty({
      example: message,
      type: String,
      description: 'A brief message about the response.',
    })
    message: string;

    @ApiProperty({
      type: type,
      description: 'The response data/payload.',
    } as ApiPropertyOptions)
    data: unknown;

    @ApiProperty({
      example: meta || null,
      description: 'Metadata for pagination and additional information.',
      required: false,
      nullable: true,
    })
    meta?: unknown;
  }

  Object.defineProperty(NonAuthoritativeInformationResponse, 'name', {
    value: `NonAuthoritativeInformationResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiResponse({
      status: 203,
      description,
      type: NonAuthoritativeInformationResponse,
    }),
  );
};
