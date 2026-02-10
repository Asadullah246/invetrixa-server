import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType, Prisma } from 'generated/prisma/client';

/**
 * Category summary for product response
 */
class CategorySummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;
}

/**
 * Attribute summary for product response
 */
class ProductAttributeSummary {
  @ApiProperty({ example: 'Color', description: 'Attribute key/name' })
  key: string;

  @ApiProperty({
    example: ['Red', 'Blue', 'Green'],
    description: 'Attribute values array',
  })
  values: string[];
}

/**
 * Parent product summary (for variants)
 */
class ParentProductSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Base Product Name' })
  name: string;
}

/**
 * Base product response DTO
 */
export class ProductResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Wireless Bluetooth Headphones' })
  name: string;

  @ApiPropertyOptional({ example: 'wireless-bluetooth-headphones' })
  slug?: string | null;

  @ApiProperty({ example: 'WBH-001' })
  sku: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  barcode?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/qr/WBH-001' })
  qrcode?: string | null;

  @ApiPropertyOptional({ example: 'High-quality wireless headphones' })
  shortDescription?: string | null;

  @ApiPropertyOptional({ example: { blocks: [] } })
  description?: Prisma.JsonValue | null;

  @ApiProperty({ example: 18 })
  taxRate: number;

  @ApiPropertyOptional({ example: 0.5 })
  weight?: number | null;

  @ApiPropertyOptional({ example: { length: 20, width: 15, height: 8 } })
  dimensions?: Prisma.JsonValue | null;

  @ApiPropertyOptional({ example: 'https://example.com/images/main.jpg' })
  featureImage?: string | null;

  @ApiProperty({ example: ['https://example.com/images/1.jpg'] })
  images: string[];

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=abc' })
  video?: string | null;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: ['electronics', 'audio'] })
  tags: string[];

  @ApiPropertyOptional({ example: { warranty: '2 years' } })
  features?: Prisma.JsonValue | null;

  @ApiProperty({ example: 10 })
  reorderLevel: number;

  @ApiPropertyOptional({ example: 'PIECE', description: 'Unit type code' })
  unitType?: string | null;

  @ApiProperty({
    enum: ProductType,
    example: ProductType.SIMPLE,
    description:
      'Product type: SIMPLE (standalone), VARIABLE (parent with variants), VARIANT (child of parent)',
  })
  productType: ProductType;

  @ApiPropertyOptional({
    enum: ['FIFO', 'LIFO', 'MOVING_AVERAGE'],
    example: 'FIFO',
    description:
      'Product-specific pricing method. Falls back to tenant default if not set.',
  })
  pricingMethod?: string | null;

  @ApiPropertyOptional({
    enum: ['PERCENT', 'FIXED_AMOUNT', 'MANUAL'],
    example: 'PERCENT',
    description: 'How to interpret markupValue',
  })
  markupType?: string | null;

  @ApiPropertyOptional({
    example: 50,
    description:
      'Percentage, fixed amount, or absolute price (depends on markupType)',
  })
  markupValue?: number | null;

  @ApiPropertyOptional({
    example: 50,
    description: 'Minimum selling price floor',
  })
  minSellingPrice?: number | null;

  @ApiPropertyOptional({
    example: 200,
    description: 'Maximum selling price ceiling',
  })
  maxSellingPrice?: number | null;

  @ApiPropertyOptional({ example: 'uuid' })
  parentId?: string | null;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Product response with categories (for list endpoints)
 */
export class ProductWithRelationsResponseDto extends ProductResponseDto {
  @ApiPropertyOptional({ type: ParentProductSummary })
  parent?: ParentProductSummary | null;

  @ApiProperty({ type: [CategorySummary] })
  categories: CategorySummary[];

  @ApiProperty({ example: 0, description: 'Number of variants' })
  variants: number;
}

/**
 * Product detail response (for single product endpoint)
 */
export class ProductDetailResponseDto extends ProductWithRelationsResponseDto {
  @ApiProperty({ type: [ProductAttributeSummary] })
  attributes: ProductAttributeSummary[];
}

/**
 * Variant summary for creation response
 */
class VariantSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PROD-RED-LRG' })
  sku: string;

  @ApiProperty({ example: 'Product - Red Large' })
  name: string;
}

/**
 * Simplified response for product creation
 */
export class CreateProductResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 16' })
  name: string;

  @ApiProperty({ example: 'iphone-16' })
  slug: string;

  @ApiProperty({ example: 'IP16' })
  sku: string;

  @ApiPropertyOptional({ type: [VariantSummary] })
  variants?: VariantSummary[];
}

/**
 * Product list item for get all response
 */
export class ProductListItemDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 16' })
  name: string;

  @ApiPropertyOptional({ example: 'iphone-16' })
  slug?: string | null;

  @ApiProperty({ example: 'IP16' })
  sku: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  barcode?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/qr/IP16' })
  qrcode?: string | null;

  @ApiProperty({ example: 18 })
  taxRate: number;

  @ApiPropertyOptional({ example: 'https://example.com/images/main.jpg' })
  featureImage?: string | null;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: 10 })
  reorderLevel: number;

  @ApiPropertyOptional({ example: 'PIECE' })
  unitType?: string | null;

  @ApiProperty({ enum: ProductType, example: ProductType.SIMPLE })
  productType: ProductType;

  @ApiPropertyOptional({ example: 'FIFO' })
  pricingMethod?: string | null;

  @ApiPropertyOptional({ example: 'PERCENT' })
  markupType?: string | null;

  @ApiPropertyOptional({ example: 50 })
  markupValue?: number | null;

  @ApiPropertyOptional({ example: 50 })
  minSellingPrice?: number | null;

  @ApiPropertyOptional({ example: 200 })
  maxSellingPrice?: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [CategorySummary] })
  categories: CategorySummary[];

  @ApiProperty({ example: 0, description: 'Number of variants' })
  variants: number;
}
