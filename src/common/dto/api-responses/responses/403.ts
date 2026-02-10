import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiForbiddenResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class ForbiddenErrorDetails {
  @ApiProperty({
    example: 'You do not have permission to access this resource.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Forbidden',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 403,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export const ApiResponseForbidden = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'You do not have permission to access this resource.',
    error = 'Forbidden',
    description = 'Forbidden',
    method = 'GET',
    path = '{resource}',
    version = 1,
  } = options;

  class ForbiddenResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 403,
      description: 'The HTTP status code.',
    })
    statusCode: number;

    @ApiProperty({
      example: method,
      description: 'The HTTP method (captured dynamically at runtime).',
    })
    method: HttpMethods;

    @ApiProperty({
      example: `api/v${version}/${path}`,
      description: 'The path of the request (captured dynamically at runtime).',
    })
    path: string;

    @ApiProperty({
      example: message,
      type: String,
      description: 'The error message.',
    })
    message: string;

    @ApiProperty({
      example: error,
      type: String,
      description: 'The error type.',
    })
    error: string;

    @ApiProperty({
      example: new Date().toISOString(),
      description: 'The timestamp of the response.',
    })
    timestamp: Date;

    @ApiProperty({
      description: 'Additional error details.',
      type: ForbiddenErrorDetails,
    })
    details?: ForbiddenErrorDetails;
  }

  Object.defineProperty(ForbiddenResponse, 'name', {
    value: `ForbiddenResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiForbiddenResponse({
      description,
      type: ForbiddenResponse,
    }),
  );
};
