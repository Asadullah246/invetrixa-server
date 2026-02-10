import { ApiProperty } from '@nestjs/swagger';
import { PricingMethod } from 'generated/prisma/client';

/**
 * Valuation line item for a single product/location combination
 */
export class ValuationLineDto {
  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'iPhone 15' })
  productName: string;

  @ApiProperty({ example: 'IP15' })
  productSku: string;

  @ApiProperty({ example: 'uuid' })
  locationId: string;

  @ApiProperty({ example: 'Warehouse A' })
  locationName: string;

  @ApiProperty({ example: 100, description: 'Total quantity on hand' })
  totalQuantity: number;

  @ApiProperty({ example: '2550.0000', description: 'Total inventory value' })
  totalValue: string;

  @ApiProperty({
    example: '25.5000',
    description: 'Average/weighted cost per unit',
  })
  averageCost: string;

  @ApiProperty({
    description: 'Valuation layers (for FIFO/LIFO detail)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        unitCost: { type: 'string', example: '25.5000' },
        remainingQty: { type: 'number', example: 50 },
        value: { type: 'string', example: '1275.0000' },
        createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  layers: Array<{
    id: string;
    unitCost: string;
    remainingQty: number;
    value: string;
    createdAt: Date;
  }>;
}

/**
 * Complete valuation report response
 */
export class ValuationReportDto {
  @ApiProperty({ enum: PricingMethod, example: PricingMethod.FIFO })
  method: PricingMethod;

  @ApiProperty({ example: '125000.0000', description: 'Total inventory value' })
  totalValue: string;

  @ApiProperty({ example: 500, description: 'Total units in stock' })
  totalUnits: number;

  @ApiProperty({ type: [ValuationLineDto] })
  items: ValuationLineDto[];
}
