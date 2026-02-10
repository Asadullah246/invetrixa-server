import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiBadRequestResponse, ApiProperty } from '@nestjs/swagger';
import { ErrorProperties } from '../types/error-properties';
import type { HttpMethods } from '../types/http-methods';

export class BadRequestErrorDetails {
  @ApiProperty({
    example: 'The request contains invalid or missing parameters.',
    description: 'The error message.',
  })
  message: string;

  @ApiProperty({
    example: 'Bad Request',
    description: 'The error type.',
  })
  error: string;

  @ApiProperty({
    example: 400,
    description: 'The HTTP status code.',
  })
  statusCode: number;
}

export const ApiResponseBadRequest = <T = unknown>(
  options: ErrorProperties<T>,
) => {
  const {
    message = 'The request contains invalid or missing parameters.',
    error = 'Bad Request',
    description = 'Bad Request',
    method = 'POST',
    path = '{resource}',
    version = 1,
  } = options;

  class BadRequestResponse {
    @ApiProperty({
      example: false,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 400,
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
      type: BadRequestErrorDetails,
    })
    details?: BadRequestErrorDetails;
  }

  Object.defineProperty(BadRequestResponse, 'name', {
    value: `BadRequestResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiBadRequestResponse({
      description,
      type: BadRequestResponse,
    }),
  );
};
