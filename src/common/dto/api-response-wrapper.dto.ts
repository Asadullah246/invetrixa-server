import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Standard API response wrapper
 * Matches the GlobalInterceptor response format
 */
export class ApiResponseWrapper<T> {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: true,
    description: 'Whether the request was successful',
  })
  success: boolean;

  @ApiProperty({ example: 'Success', description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: T;
}

/**
 * Factory function to create a Swagger-compatible wrapped response DTO
 *
 * @example
 * // In decorator:
 * @ApiOkResponse({ type: createWrappedResponseDto(CategoryDetailResponseDto) })
 */
export function createWrappedResponseDto<T>(
  dataType: Type<T>,
  description?: string,
): Type<ApiResponseWrapper<T>> {
  class WrappedResponseDto implements ApiResponseWrapper<T> {
    @ApiProperty({ example: 200, description: 'HTTP status code' })
    statusCode: number;

    @ApiProperty({
      example: true,
      description: 'Whether the request was successful',
    })
    success: boolean;

    @ApiProperty({ example: 'Success', description: 'Response message' })
    message: string;

    @ApiProperty({
      type: dataType,
      description: description ?? 'Response data',
    })
    data: T;
  }

  // Set a unique name for Swagger
  Object.defineProperty(WrappedResponseDto, 'name', {
    value: `Wrapped${dataType.name}`,
  });

  return WrappedResponseDto;
}

/**
 * Wrapped response with pagination meta
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPreviousPage: boolean;
}

/**
 * Standard paginated API response wrapper
 */
export class ApiPaginatedResponseWrapper<T> {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: true,
    description: 'Whether the request was successful',
  })
  success: boolean;

  @ApiProperty({ example: 'Success', description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data array' })
  data: T[];

  @ApiPropertyOptional({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta?: PaginationMetaDto;
}

/**
 * Factory function to create a Swagger-compatible wrapped paginated response DTO
 *
 * @example
 * // In decorator:
 * @ApiOkResponse({ type: createWrappedPaginatedResponseDto(CategoryWithCountResponseDto) })
 */
export function createWrappedPaginatedResponseDto<T>(
  itemType: Type<T>,
): Type<ApiPaginatedResponseWrapper<T>> {
  class WrappedPaginatedResponseDto implements ApiPaginatedResponseWrapper<T> {
    @ApiProperty({ example: 200, description: 'HTTP status code' })
    statusCode: number;

    @ApiProperty({
      example: true,
      description: 'Whether the request was successful',
    })
    success: boolean;

    @ApiProperty({ example: 'Success', description: 'Response message' })
    message: string;

    @ApiProperty({ type: [itemType], description: 'Response data array' })
    data: T[];

    @ApiProperty({
      type: PaginationMetaDto,
      description: 'Pagination metadata',
    })
    meta: PaginationMetaDto;
  }

  // Set a unique name for Swagger
  Object.defineProperty(WrappedPaginatedResponseDto, 'name', {
    value: `PaginatedWrapped${itemType.name}`,
  });

  return WrappedPaginatedResponseDto;
}
