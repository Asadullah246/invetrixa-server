import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferStatus } from 'generated/prisma/client';

// Summary DTOs for related entities
class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Warehouse A' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-A' })
  code?: string | null;
}

class ProductSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  name: string;

  @ApiProperty({ example: 'IPHONE-15-PRO' })
  sku: string;
}

class UserSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string | null;
}

// Simple create response (data only, message is in wrapper)
export class CreateTransferResponseDto {
  @ApiProperty({ example: 'uuid' })
  transferId: string;

  @ApiProperty({ example: 'TRF-2024-001' })
  transferNumber: string;
}

// Transfer item response (for detail view)
export class TransferItemResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ type: ProductSummary })
  product: ProductSummary;

  @ApiProperty({ example: 50 })
  requestedQuantity: number;

  @ApiProperty({ example: 50 })
  shippedQuantity: number;

  @ApiProperty({ example: 50 })
  receivedQuantity: number;

  @ApiPropertyOptional({
    example: 'Damaged during transit',
    description: 'Reason for shortage when receivedQuantity < shippedQuantity',
  })
  shortageReason?: string | null;

  @ApiPropertyOptional({ example: 'Additional notes' })
  note?: string | null;
}

// Transfer list item (flattened for list view)
export class TransferWithRelationsResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TRF-2024-001' })
  transferNumber: string;

  @ApiProperty({ enum: TransferStatus, example: TransferStatus.DRAFT })
  status: TransferStatus;

  @ApiPropertyOptional({ example: 'Weekly restock' })
  note?: string | null;

  @ApiProperty({ example: '2024-01-07T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-07T12:00:00.000Z' })
  shippedAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-07T14:00:00.000Z' })
  receivedAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  cancelledAt?: Date | null;

  @ApiProperty({ example: 'Warehouse A' })
  fromLocation: string;

  @ApiProperty({ example: 'Warehouse B' })
  toLocation: string;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  createdBy?: string | null;

  @ApiProperty({ example: 3 })
  itemCount: number;

  @ApiProperty({ example: 150 })
  totalRequestedQuantity: number;
}

// Transfer with full details (for detail view)
export class TransferDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TRF-2024-001' })
  transferNumber: string;

  @ApiProperty({ enum: TransferStatus, example: TransferStatus.DRAFT })
  status: TransferStatus;

  @ApiPropertyOptional({ example: 'Weekly restock' })
  note?: string | null;

  @ApiProperty({ example: '2024-01-07T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-07T12:00:00.000Z' })
  shippedAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-07T14:00:00.000Z' })
  receivedAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  cancelledAt?: Date | null;

  @ApiProperty({ type: LocationSummary })
  fromLocation: LocationSummary;

  @ApiProperty({ type: LocationSummary })
  toLocation: LocationSummary;

  @ApiPropertyOptional({ type: UserSummary, nullable: true })
  createdBy?: UserSummary | null;

  @ApiProperty({ example: 3 })
  itemCount: number;

  @ApiProperty({ example: 150 })
  totalRequestedQuantity: number;

  @ApiProperty({ type: [TransferItemResponseDto] })
  items: TransferItemResponseDto[];
}
