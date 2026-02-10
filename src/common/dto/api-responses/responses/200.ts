import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptions,
} from '@nestjs/swagger';
import { SuccessProperties } from '../types/success-response';

export const ApiResponseOk = (options: SuccessProperties) => {
  const {
    message = 'Request successful',
    description = 'OK',
    type,
    meta,
  } = options;

  class OkResponse {
    @ApiProperty({
      example: true,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 200,
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

  Object.defineProperty(OkResponse, 'name', {
    value: `OkResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiOkResponse({
      description,
      type: OkResponse,
    }),
  );
};
