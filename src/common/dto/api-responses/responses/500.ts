import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiInternalServerErrorResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class InternalServerErrorDetails {
  @ApiProperty({
    example: 'An internal server error occurred.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Internal Server Error',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 500,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export class InternalServerErrorResponse {
  @ApiProperty({
    example: false,
    description: 'Indicates if the request was successful.',
  })
  success: boolean;

  @ApiProperty({
    example: 500,
    description: 'The HTTP status code.',
  })
  statusCode: number;

  @ApiProperty({
    example: 'GET',
    description: 'The HTTP method (captured dynamically at runtime).',
  })
  method: HttpMethods;

  @ApiProperty({
    example: `api/v1/{resource}`,
    description: 'The path of the request (captured dynamically at runtime).',
  })
  path: string;

  @ApiProperty({
    example: 'An internal server error occurred.',
    type: String,
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Internal Server Error',
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
    type: InternalServerErrorDetails,
  })
  details?: InternalServerErrorDetails;
}

export const ApiResponseInternalServerError = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'An internal server error occurred.',
    error = 'Internal Server Error',
    description = 'Internal Server Error',
    method = 'GET',
    path = '{resource}',
    version = 1,
  } = options;

  class InternalServerErrorResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 500,
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
      type: InternalServerErrorDetails,
    })
    details?: InternalServerErrorDetails;
  }

  Object.defineProperty(InternalServerErrorResponse, 'name', {
    value: `InternalServerErrorResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiInternalServerErrorResponse({
      description,
      type: InternalServerErrorResponse,
    }),
  );
};
