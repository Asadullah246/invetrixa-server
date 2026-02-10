import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  ApiCreatedResponse,
  ApiProperty,
  ApiPropertyOptions,
} from '@nestjs/swagger';
import { SuccessProperties } from '../types/success-response';

export const ApiResponseCreated = <T = unknown>(options: SuccessProperties) => {
  const {
    message = 'Resource created successfully',
    description = 'Created',
    type,
    meta = null,
  } = options;

  class CreatedResponse {
    @ApiProperty({
      example: true,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 201,
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
      ...(type && { type }),
      description: 'The response data/payload.',
    } as ApiPropertyOptions)
    data: T;

    @ApiProperty({
      example: meta || null,
      description: 'Metadata for pagination and additional information.',
      required: false,
      nullable: true,
    })
    meta?: unknown;
  }

  Object.defineProperty(CreatedResponse, 'name', {
    value: `CreatedResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiCreatedResponse({
      description,
      type: CreatedResponse,
    }),
  );
};
