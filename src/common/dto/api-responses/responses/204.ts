import { applyDecorators } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ApiNoContentResponse, ApiProperty } from '@nestjs/swagger';
import { SuccessProperties } from '../types/success-response';

export const ApiResponseNoContent = (options: SuccessProperties) => {
  const {
    message = 'No Content',
    description = 'No Content - The request was successful but there is no content to return',
  } = options;

  class NoContentResponse {
    @ApiProperty({
      example: true,
      description: 'Indicates if the request was successful.',
    })
    success: boolean;

    @ApiProperty({
      example: 204,
      description: 'The HTTP status code.',
    })
    statusCode: number;

    @ApiProperty({
      example: message,
      type: String,
      description: 'A brief message about the response.',
    })
    message: string;
  }

  Object.defineProperty(NoContentResponse, 'name', {
    value: `NoContentResponse_${uuid()}`,
  });

  return applyDecorators(
    ApiNoContentResponse({
      description,
      type: NoContentResponse,
    }),
  );
};
