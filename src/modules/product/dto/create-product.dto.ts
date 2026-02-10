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
  UUIDField,
} from '@/common/decorator/fields';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsObject,
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ATTRIBUTE INPUT ====================

/**
 * DTO for product attribute key-value pairs
 * Parent products have all values, variants have single value
 */
export class ProductAttributeInput {
  @StringField('Attribute Key', {
    required: true,
    max: 100,
    example: 'Color',
  })
  key: string;

  @StringArrayField('Values', {
    required: true,
    example: ['Red', 'Blue', 'Green'],
  })
  values: string[];
}

// ==================== INITIAL STOCK INPUT ====================

/**
 * DTO for initial stock when creating a product
 * Used for both simple products and variants
 */
export class InitialStockInput {
  @UUIDField('Location ID', { required: true })
  locationId: string;

  @NumberField('Quantity', {
    required: true,
    min: 1,
    integer: true,
    example: 100,
  })
  quantity: number;

  @NumberField('Unit Cost', {
    required: true,
    min: 0,
    example: 25.5,
  })
  unitCost: number;

  @UUIDField('Supplier ID', { required: false })
  supplierId?: string;

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'Initial opening stock',
  })
  note?: string;
}

// ==================== VARIANT INPUT ====================

/**
 * DTO for explicit variant creation
 */
export class VariantInput {
  @StringField('Variant Name', {
    required: false,
    max: 255,
    example: 'iPhone 15 - Black 128GB',
  })
  name?: string;

  @StringField('SKU', {
    required: false, // Auto-generated if not provided
    max: 100,
    example: 'IP15-BLK-128',
  })
  sku?: string;

  @StringField('Barcode', {
    required: false,
    max: 100,
    example: '1234567890123',
  })
  barcode?: string;

  @NumberField('Weight', { required: false, min: 0, example: 171 })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Variant dimensions (overrides parent)',
    example: { length: 14.7, width: 7.1, height: 0.8, unit: 'cm' },
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, unknown>;

  @StringField('Feature Image URL', {
    required: false,
    example: 'ip15-black.jpg',
  })
  featureImage?: string;

  @StringArrayField('Image URLs', {
    required: false,
    example: ['img1.jpg', 'img2.jpg'],
  })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Variant attribute values (single value per key)',
    type: [ProductAttributeInput],
    example: [
      { key: 'Color', values: ['Black'] },
      { key: 'Storage', values: ['128GB'] },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInput)
  attributes?: ProductAttributeInput[];

  // === Initial Stock ===
  @ApiPropertyOptional({
    description: 'Initial stock for this variant',
    type: [InitialStockInput],
    example: [
      {
        locationId: 'uuid',
        quantity: 50,
        unitCost: 10.0,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockInput)
  initialStock?: InitialStockInput[];
}

// ==================== CREATE PRODUCT DTO ====================

/**
 * DTO for creating a new product (with optional explicit variants)
 */
export class CreateProductDto {
  // === Basic Information ===
  @StringField('Product Name', {
    required: true,
    max: 255,
    example: 'iPhone 15',
  })
  name: string;

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
    required: true,
    max: 50,
    example: 'PIECE',
  })
  unitType: string;

  @EnumField('Pricing Method', PricingMethod, { required: true })
  pricingMethod: PricingMethod;

  // === Selling Price / Markup ===
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

  // === Relations ===
  @ApiProperty({
    description:
      'Category IDs to assign to the product (at least one required)',
    type: [String],
    example: ['category-uuid-1', 'category-uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one category is required' })
  @IsUUID('4', { each: true })
  categoryIds: string[];

  // === Explicit Variants ===
  @ApiPropertyOptional({
    description:
      'Explicit variants with optional SKUs (auto-generated if missing)',
    type: [VariantInput],
    example: [
      {
        name: 'iPhone 15 - Black 128GB',
        sku: 'IP15-BLK-128',
        barcode: '1111111111111',
        attributes: [
          { key: 'Color', values: ['Black'] },
          { key: 'Storage', values: ['128GB'] },
        ],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants?: VariantInput[];

  // === Initial Stock (for simple products) ===
  @ApiPropertyOptional({
    description:
      'Initial stock for simple products. For variable products, use initialStock in each variant.',
    type: [InitialStockInput],
    example: [
      {
        locationId: 'uuid',
        quantity: 100,
        unitCost: 25.5,
        note: 'Opening stock',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockInput)
  initialStock?: InitialStockInput[];
}
