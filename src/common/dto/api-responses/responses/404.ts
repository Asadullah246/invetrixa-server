import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiNotFoundResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class NotFoundErrorDetails {
  @ApiProperty({
    example: 'The requested resource was not found.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Not Found',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 404,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export const ApiResponseNotFound = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'The requested resource was not found.',
    error = 'Not Found',
    description = 'Not Found',
    method = 'GET',
    path = '{resource}',
    version = 1,
  } = options;

  class NotFoundResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 404,
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
      type: NotFoundErrorDetails,
    })
    details?: NotFoundErrorDetails;
  }

  Object.defineProperty(NotFoundResponse, 'name', {
    value: `NotFoundResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiNotFoundResponse({
      description,
      type: NotFoundResponse,
    }),
  );
};
