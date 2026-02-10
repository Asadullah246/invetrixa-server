import { StockReferenceType } from 'generated/prisma/client';
import {
  NumberField,
  UUIDField,
  StringField,
  EnumField,
} from '@/common/decorator/fields';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

/**
 * Single item for bulk stock out
 */
export class BulkStockOutItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', {
    required: true,
    min: 1,
    integer: true,
    example: 50,
  })
  quantity: number;

  @UUIDField('Batch ID', { required: false })
  batchId?: string;
}

/**
 * DTO for bulk stock out (multiple products at once)
 */
export class BulkStockOutDto {
  @UUIDField('Location ID', { required: true })
  locationId: string;

  @EnumField('Reference Type', StockReferenceType, { required: false })
  referenceType?: StockReferenceType;

  @StringField('Reference ID', {
    required: false,
    max: 100,
    example: 'SO-2024-001',
  })
  referenceId?: string;

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'Bulk stock out for sales order',
  })
  note?: string;

  @ApiProperty({
    description: 'Items to release',
    type: [BulkStockOutItemDto],
    example: [
      { productId: 'uuid-1', quantity: 20 },
      { productId: 'uuid-2', quantity: 30 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockOutItemDto)
  items: BulkStockOutItemDto[];
}

/**
 * Response for bulk stock out operation
 */
export class BulkStockOutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Successfully released 3 items' })
  message: string;

  @ApiProperty({ example: 3 })
  totalItems: number;

  @ApiProperty({ example: 150 })
  totalQuantity: number;

  @ApiProperty({ example: 375.5 })
  totalCost: number;

  @ApiProperty({ description: 'Created movement IDs' })
  movementIds: string[];
}
