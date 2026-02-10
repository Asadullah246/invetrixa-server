import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Nested product summary for balance response
 */
class ProductInfo {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 15' })
  name: string;

  @ApiProperty({ example: 'IP15' })
  sku: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Reorder level from product settings',
  })
  reorderLevel?: number | null;
}

/**
 * Nested location summary for balance response
 */
class LocationInfo {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Warehouse A' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  code?: string | null;
}

/**
 * Base inventory balance response DTO
 */
export class BalanceResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 100 })
  onHandQuantity: number;

  @ApiProperty({ example: 10 })
  reservedQuantity: number;

  @ApiProperty({ example: 90, description: 'Available = On Hand - Reserved' })
  availableQuantity: number;

  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'uuid' })
  locationId: string;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;
}

/**
 * Balance response with product and location details
 */
export class BalanceWithRelationsResponseDto extends BalanceResponseDto {
  @ApiProperty({ type: ProductInfo })
  product: ProductInfo;

  @ApiProperty({ type: LocationInfo })
  location: LocationInfo;

  @ApiProperty({
    example: false,
    description: 'True if on-hand is below reorder level',
  })
  isLowStock: boolean;
}

/**
 * Aggregated balance for a product across all locations
 */
export class ProductBalanceSummaryDto {
  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'iPhone 15' })
  productName: string;

  @ApiProperty({ example: 'IP15' })
  productSku: string;

  @ApiProperty({
    example: 500,
    description: 'Total on-hand across all locations',
  })
  totalOnHand: number;

  @ApiProperty({
    example: 50,
    description: 'Total reserved across all locations',
  })
  totalReserved: number;

  @ApiProperty({
    example: 450,
    description: 'Total available across all locations',
  })
  totalAvailable: number;

  @ApiProperty({
    description: 'Balance per location',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        locationId: { type: 'string', example: 'uuid' },
        locationName: { type: 'string', example: 'Warehouse A' },
        onHandQuantity: { type: 'number', example: 300 },
        reservedQuantity: { type: 'number', example: 30 },
        availableQuantity: { type: 'number', example: 270 },
      },
    },
  })
  locations: Array<{
    locationId: string;
    locationName: string;
    onHandQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  }>;
}

/**
 * Aggregated balance for a location across all products
 */
export class LocationBalanceSummaryDto {
  @ApiProperty({ example: 'uuid' })
  locationId: string;

  @ApiProperty({ example: 'Warehouse A' })
  locationName: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  locationCode?: string | null;

  @ApiProperty({
    example: 1000,
    description: 'Total units across all products',
  })
  totalUnits: number;

  @ApiProperty({ example: 25, description: 'Number of distinct products' })
  productCount: number;

  @ApiProperty({
    description: 'Balance per product',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        productId: { type: 'string', example: 'uuid' },
        productName: { type: 'string', example: 'iPhone 15' },
        productSku: { type: 'string', example: 'IP15' },
        onHandQuantity: { type: 'number', example: 100 },
        reservedQuantity: { type: 'number', example: 10 },
        availableQuantity: { type: 'number', example: 90 },
      },
    },
  })
  products: Array<{
    productId: string;
    productName: string;
    productSku: string;
    onHandQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  }>;
}

/**
 * Low stock alert item
 */
export class LowStockItemDto {
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

  @ApiProperty({ example: 5, description: 'Current on-hand quantity' })
  onHandQuantity: number;

  @ApiProperty({ example: 10, description: 'Reorder level threshold' })
  reorderLevel: number;

  @ApiProperty({ example: 5, description: 'Units below reorder level' })
  shortage: number;
}
