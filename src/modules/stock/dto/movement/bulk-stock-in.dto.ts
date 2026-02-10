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
 * Single item for bulk stock in
 */
export class BulkStockInItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', {
    required: true,
    min: 1,
    integer: true,
    example: 100,
  })
  quantity: number;

  @NumberField('Unit Cost', { required: true, min: 0, example: 25.5 })
  unitCost: number;

  @UUIDField('Batch ID', { required: false })
  batchId?: string;
}

/**
 * DTO for bulk stock in (multiple products at once)
 */
export class BulkStockInDto {
  @UUIDField('Location ID', { required: true })
  locationId: string;

  @EnumField('Reference Type', StockReferenceType, { required: false })
  referenceType?: StockReferenceType;

  @StringField('Reference ID', {
    required: false,
    max: 100,
    example: 'PO-2024-001',
  })
  referenceId?: string;

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'stock receiving from supplier or return from customer',
  })
  note?: string;

  @ApiProperty({
    description: 'Items to receive',
    type: [BulkStockInItemDto],
    example: [
      { productId: 'uuid-1', quantity: 20, unitCost: 10.0 },
      { productId: 'uuid-2', quantity: 30, unitCost: 15.0 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockInItemDto)
  items: BulkStockInItemDto[];
}

/**
 * Response for bulk stock in operation
 */
export class BulkStockInResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Successfully received 3 items' })
  message: string;

  @ApiProperty({ example: 3 })
  totalItems: number;

  @ApiProperty({ example: 150 })
  totalQuantity: number;

  @ApiProperty({ description: 'Created movement IDs' })
  movementIds: string[];
}
