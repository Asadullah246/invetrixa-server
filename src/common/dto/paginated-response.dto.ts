import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Pagination metadata for API responses
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
 * Generic paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMetaDto;
}

/**
 * Factory function to create a Swagger-compatible paginated response DTO
 *
 * @example
 * // In controller:
 * @ApiOkResponse({ type: createPaginatedResponseDto(CategoryWithCountResponseDto) })
 * async findAll(): Promise<PaginatedResponse<CategoryWithCountResponseDto>> { ... }
 */
export function createPaginatedResponseDto<T>(
  itemType: Type<T>,
): Type<PaginatedResponse<T>> {
  class PaginatedResponseDto implements PaginatedResponse<T> {
    @ApiProperty({ type: [itemType], description: 'Array of items' })
    data: T[];

    @ApiProperty({
      type: PaginationMetaDto,
      description: 'Pagination metadata',
    })
    meta: PaginationMetaDto;
  }

  // Set a unique name for Swagger
  Object.defineProperty(PaginatedResponseDto, 'name', {
    value: `Paginated${itemType.name}`,
  });

  return PaginatedResponseDto;
}
