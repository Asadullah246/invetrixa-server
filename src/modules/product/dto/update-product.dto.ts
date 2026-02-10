import {
  ProductStatus,
  PricingMethod,
  MarkupType,
} from 'generated/prisma/client';
import {
  StringField,
  EnumField,
  NumberField,
  BooleanField,
  StringArrayField,
} from '@/common/decorator/fields';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsArray, IsUUID } from 'class-validator';

/**
 * DTO for updating a product
 * Note: variants and initialStock cannot be updated via this endpoint
 */
export class UpdateProductDto {
  // === Basic Information ===
  @StringField('Product Name', {
    required: false,
    max: 255,
    example: 'iPhone 15',
  })
  name?: string;

  @StringField('URL Slug', {
    required: false,
    max: 255,
    example: 'iphone-15',
  })
  slug?: string;

  @StringField('SKU', {
    required: false,
    max: 100,
    example: 'IP15',
  })
  sku?: string;

  @StringField('Barcode', {
    required: false,
    max: 100,
    example: '1234567890123',
  })
  barcode?: string;

  @StringField('QR Code', {
    required: false,
    max: 255,
    example: 'https://example.com/qr/IP15',
  })
  qrcode?: string;

  // === Descriptions ===
  @StringField('Short Description', {
    required: false,
    max: 500,
    example: 'Latest Apple iPhone',
  })
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Detailed product description (JSON format for rich text)',
    example: {
      blocks: [{ type: 'paragraph', data: { text: 'Description here' } }],
    },
  })
  @IsOptional()
  @IsObject()
  description?: Record<string, unknown>;

  // === Tax ===
  @NumberField('Tax Rate', {
    required: false,
    min: 0,
    max: 100,
    example: 18,
  })
  taxRate?: number;

  // === Physical Attributes ===
  @NumberField('Weight', {
    required: false,
    min: 0,
    example: 171,
  })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions (length, width, height)',
    example: { length: 14.7, width: 7.1, height: 0.8, unit: 'cm' },
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, unknown>;

  // === Media ===
  @StringField('Feature Image URL', {
    required: false,
    example: 'https://example.com/images/iphone-main.jpg',
  })
  featureImage?: string;

  @StringArrayField('Image URLs', {
    required: false,
    example: ['img1.jpg', 'img2.jpg'],
  })
  images?: string[];

  @StringField('Video URL', {
    required: false,
    example: 'https://youtube.com/watch?v=abc123',
  })
  video?: string;

  // === Status & Visibility ===
  @EnumField('Status', ProductStatus, { required: false })
  status?: ProductStatus;

  @BooleanField('Featured Product', { required: false, example: false })
  isFeatured?: boolean;

  // === Tags & Features ===
  @StringArrayField('Tags', {
    required: false,
    example: ['electronics', 'phones', 'apple'],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Product features (JSON format)',
    example: { warranty: '1 year', connectivity: '5G' },
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  // === Inventory ===
  @NumberField('Reorder Level', {
    required: false,
    min: 0,
    example: 10,
  })
  reorderLevel?: number;

  @StringField('Unit Type', {
    required: false,
    max: 50,
    example: 'PIECE',
  })
  unitType?: string;

  // === Pricing ===
  @EnumField('Pricing Method', PricingMethod, { required: false })
  pricingMethod?: PricingMethod;

  @EnumField('Markup Type', MarkupType, { required: false })
  markupType?: MarkupType;

  @NumberField('Markup Value', {
    required: false,
    min: 0,
    example: 50,
  })
  markupValue?: number;

  @NumberField('Min Selling Price', {
    required: false,
    min: 0,
    example: 50,
  })
  minSellingPrice?: number;

  @NumberField('Max Selling Price', {
    required: false,
    min: 0,
    example: 200,
  })
  maxSellingPrice?: number;

  // === Categories ===
  @ApiPropertyOptional({
    description: 'Category IDs to assign to the product',
    type: [String],
    example: ['category-uuid-1', 'category-uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
