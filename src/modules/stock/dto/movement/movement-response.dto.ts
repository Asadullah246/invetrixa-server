import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StockMovementType,
  StockMovementStatus,
  StockReferenceType,
} from 'generated/prisma/client';

/**
 * Nested product summary for movement response
 */
class ProductSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 15' })
  name: string;

  @ApiProperty({ example: 'IP15' })
  sku: string;
}

/**
 * Nested location summary for movement response
 */
class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Warehouse A' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  code?: string | null;
}

/**
 * Nested user summary for movement response
 */
class UserSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

/**
 * Base stock movement response DTO
 */
export class MovementResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: StockMovementType, example: StockMovementType.IN })
  movementType: StockMovementType;

  @ApiProperty({ example: 100 })
  quantity: number;

  @ApiProperty({ example: '25.5000', description: 'Unit cost (Decimal)' })
  unitCost: string;

  @ApiProperty({ example: '2550.0000', description: 'Total cost (Decimal)' })
  totalCost: string;

  @ApiProperty({
    enum: StockReferenceType,
    example: StockReferenceType.PURCHASE,
  })
  referenceType: StockReferenceType;

  @ApiPropertyOptional({ example: 'PO-2024-001' })
  referenceId?: string | null;

  @ApiProperty({
    enum: StockMovementStatus,
    example: StockMovementStatus.COMPLETED,
  })
  status: StockMovementStatus;

  @ApiPropertyOptional({ example: 'Initial stock from supplier' })
  note?: string | null;

  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'uuid' })
  locationId: string;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiPropertyOptional({ example: 'uuid' })
  createdById?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

/**
 * Stock movement response with product and location details
 */
export class MovementWithRelationsResponseDto extends MovementResponseDto {
  @ApiProperty({ type: ProductSummary })
  product: ProductSummary;

  @ApiProperty({ type: LocationSummary })
  location: LocationSummary;

  @ApiPropertyOptional({ type: UserSummary })
  createdBy?: UserSummary | null;
}

/**
 * Stock movement detail response with consumption data
 */
export class MovementDetailResponseDto extends MovementWithRelationsResponseDto {
  @ApiPropertyOptional({
    description: 'Valuation layers consumed (for OUT movements)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        quantity: { type: 'number', example: 50 },
        unitCost: { type: 'string', example: '25.5000' },
      },
    },
  })
  consumptions?: Array<{
    id: string;
    quantity: number;
    unitCost: string;
  }>;
}
