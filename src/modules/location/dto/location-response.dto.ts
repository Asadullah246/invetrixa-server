import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LocationType,
  LocationSubType,
  LocationStatus,
} from 'generated/prisma/client';

/**
 * Address summary for location response
 */
export class AddressSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: '123 Main Street' })
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Suite 100' })
  addressLine2?: string | null;

  @ApiProperty({ example: 'Dhaka' })
  city: string;

  @ApiProperty({ example: 'Dhaka Division' })
  state: string;

  @ApiProperty({ example: '1205' })
  postalCode: string;

  @ApiProperty({ example: 'Bangladesh' })
  country: string;

  @ApiPropertyOptional({ example: 23.8103 })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 90.4125 })
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/?q=23.8103,90.4125',
  })
  googleMapUrl?: string | null;
}

/**
 * Creator summary for location response
 */
export class CreatorSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string | null;
}

/**
 * Base location response DTO
 */
export class LocationResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dhaka Warehouse' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-01' })
  code?: string | null;

  @ApiProperty({ enum: LocationType, example: LocationType.WAREHOUSE })
  type: LocationType;

  @ApiProperty({ enum: LocationSubType, example: LocationSubType.PHYSICAL })
  subType: LocationSubType;

  @ApiProperty({ example: 'warehouse@example.com' })
  email: string;

  @ApiProperty({ example: '+8801712345678' })
  phone: string;

  @ApiProperty({ example: '9:00 AM - 5:00 PM' })
  businessHours: string;

  @ApiPropertyOptional({ example: 1000 })
  totalCapacity?: number | null;

  @ApiProperty({ enum: LocationStatus, example: LocationStatus.ACTIVE })
  status: LocationStatus;

  @ApiProperty({ example: '2020-01-01T00:00:00.000Z' })
  establishedYear: Date;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Location response with address (for list endpoints)
 */
export class LocationWithAddressResponseDto extends LocationResponseDto {
  @ApiPropertyOptional({ type: AddressSummary })
  address?: AddressSummary | null;
}

/**
 * Location detail response (for single location endpoint)
 */
export class LocationDetailResponseDto extends LocationWithAddressResponseDto {
  @ApiPropertyOptional({ type: CreatorSummary })
  createdBy?: CreatorSummary | null;
}
