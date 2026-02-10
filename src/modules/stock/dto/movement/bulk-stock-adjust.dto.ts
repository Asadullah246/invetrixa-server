import { NumberField, UUIDField, StringField } from '@/common/decorator/fields';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

/**
 * Single item for bulk stock adjustment
 */
export class BulkStockAdjustItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', {
    required: true,
    integer: true,
    notZero: true,
    example: -5,
  })
  quantity: number;

  @NumberField('Unit Cost', {
    required: false,
    min: 0,
    example: 25.5,
  })
  unitCost?: number;
}

/**
 * DTO for bulk stock adjustment (multiple products at once)
 * Positive quantity = stock in, Negative quantity = stock out
 */
export class BulkStockAdjustDto {
  @UUIDField('Location ID', { required: true })
  locationId: string;

  @StringField('Reason', {
    required: true,
    max: 255,
    example: 'Inventory count adjustment',
  })
  reason: string;

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'Annual inventory reconciliation',
  })
  note?: string;

  @ApiProperty({
    description: 'Items to adjust (positive = in, negative = out)',
    type: [BulkStockAdjustItemDto],
    example: [
      { productId: 'uuid-1', quantity: 10, unitCost: 5.0 },
      { productId: 'uuid-2', quantity: -5 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockAdjustItemDto)
  items: BulkStockAdjustItemDto[];
}

/**
 * Response for bulk stock adjustment operation
 */
export class BulkStockAdjustResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Successfully adjusted 3 items' })
  message: string;

  @ApiProperty({ example: 3 })
  totalItems: number;

  @ApiProperty({ example: 2, description: 'Items with positive adjustment' })
  positiveAdjustments: number;

  @ApiProperty({ example: 1, description: 'Items with negative adjustment' })
  negativeAdjustments: number;

  @ApiProperty({ description: 'Created movement IDs' })
  movementIds: string[];
}
