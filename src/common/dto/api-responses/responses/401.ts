import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiUnauthorizedResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class UnauthorizedErrorDetails {
  @ApiProperty({
    example: 'Authentication is required to access this resource.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Unauthorized',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 401,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export const ApiResponseUnauthorized = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'Authentication is required to access this resource.',
    error = 'Unauthorized',
    description = 'Unauthorized',
    method = 'GET',
    path = '{resource}',
    version = 1,
  } = options;

  class UnauthorizedResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 401,
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
      type: UnauthorizedErrorDetails,
    })
    details?: UnauthorizedErrorDetails;
  }

  Object.defineProperty(UnauthorizedResponse, 'name', {
    value: `UnauthorizedResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiUnauthorizedResponse({
      description,
      type: UnauthorizedResponse,
    }),
  );
};
