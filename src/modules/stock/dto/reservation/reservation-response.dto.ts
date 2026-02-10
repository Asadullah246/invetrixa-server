import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from 'generated/prisma/client';

class ProductSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  name: string;

  @ApiProperty({ example: 'IPHONE-15-PRO' })
  sku: string;
}

class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Warehouse A' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  code?: string | null;
}

// Reservation response DTO (for list view)
export class ReservationWithRelationsResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 5 })
  quantity: number;

  @ApiProperty({ example: '2024-01-07T15:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.ACTIVE })
  status: ReservationStatus;

  @ApiPropertyOptional({ example: 'CART' })
  referenceType?: string | null;

  @ApiPropertyOptional({ example: 'cart-uuid' })
  referenceId?: string | null;

  @ApiProperty({ example: '2024-01-07T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  productName: string;

  @ApiProperty({ example: 'Warehouse A' })
  locationName: string;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  createdBy?: string | null;
}

// Reservation detail response DTO (for single view with full product/location info)
export class ReservationDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 5 })
  quantity: number;

  @ApiProperty({ example: '2024-01-07T15:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.ACTIVE })
  status: ReservationStatus;

  @ApiPropertyOptional({ example: 'CART' })
  referenceType?: string | null;

  @ApiPropertyOptional({ example: 'cart-uuid' })
  referenceId?: string | null;

  @ApiProperty({ example: '2024-01-07T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-07T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: ProductSummary })
  product: ProductSummary;

  @ApiProperty({ type: LocationSummary })
  location: LocationSummary;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  createdBy?: string | null;
}
