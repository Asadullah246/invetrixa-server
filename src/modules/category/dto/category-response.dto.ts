import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from 'generated/prisma/client';

/**
 * Parent category summary (nested in response)
 */
class ParentCategorySummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 'electronics' })
  slug: string;
}

/**
 * Child category summary (nested in findOne response)
 */
class ChildCategorySummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Smartphones' })
  name: string;

  @ApiProperty({ example: 'smartphones' })
  slug: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;
}

/**
 * Count summary for list endpoints (includes children)
 */
class CategoryCount {
  @ApiProperty({ example: 3, description: 'Number of child categories' })
  children: number;

  @ApiProperty({ example: 10, description: 'Number of products in category' })
  products: number;
}

/**
 * Count summary for detail endpoint (only products, children are returned as array)
 */
class CategoryDetailCount {
  @ApiProperty({ example: 10, description: 'Number of products in category' })
  products: number;
}

/**
 * Base category response DTO
 */
export class CategoryResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 'electronics' })
  slug: string;

  @ApiPropertyOptional({ example: 'Electronic devices and gadgets' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  image?: string | null;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiPropertyOptional({ example: 'uuid' })
  parentId?: string | null;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: ParentCategorySummary })
  parent?: ParentCategorySummary | null;
}

/**
 * Category response with count (for list endpoints)
 */
export class CategoryWithCountResponseDto extends CategoryResponseDto {
  @ApiProperty({ type: CategoryCount })
  _count: CategoryCount;
}

/**
 * Category response with children (for single category endpoint)
 */
export class CategoryDetailResponseDto extends CategoryResponseDto {
  @ApiProperty({ type: [ChildCategorySummary] })
  children: ChildCategorySummary[];

  @ApiProperty({ type: CategoryDetailCount })
  _count: CategoryDetailCount;
}
