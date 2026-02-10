import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiConflictResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class ConflictErrorDetails {
  @ApiProperty({
    example:
      'The resource already exists or there is a conflict with the current state.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Conflict',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 409,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export const ApiResponseConflict = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'The resource already exists or there is a conflict with the current state.',
    error = 'Conflict',
    description = 'Conflict',
    method = 'POST',
    path = '{resource}',
    version = 1,
  } = options;

  class ConflictResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 409,
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
      type: ConflictErrorDetails,
    })
    details?: ConflictErrorDetails;
  }

  Object.defineProperty(ConflictResponse, 'name', {
    value: `ConflictResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiConflictResponse({
      description,
      type: ConflictResponse,
    }),
  );
};
