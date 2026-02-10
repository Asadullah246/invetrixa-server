import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerType,
  CustomerStatus,
  AddressType,
} from 'generated/prisma/enums';

/**
 * Response DTO for customer address
 */
export class CustomerAddressResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: AddressType, example: AddressType.BOTH })
  addressType: AddressType;

  @ApiPropertyOptional({ example: 'Home' })
  label?: string | null;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiPropertyOptional({ example: '123 Main Street' })
  addressLine1?: string | null;

  @ApiPropertyOptional({ example: 'Suite 456' })
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: 'New York' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'NY' })
  state?: string | null;

  @ApiPropertyOptional({ example: '10001' })
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'USA' })
  country?: string | null;

  @ApiPropertyOptional({ example: 40.7128 })
  latitude?: number | null;

  @ApiPropertyOptional({ example: -74.006 })
  longitude?: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Base customer response DTO
 */
export class CustomerResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.INDIVIDUAL })
  customerType: CustomerType;

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string | null;

  @ApiPropertyOptional({ example: 'Acme Corporation' })
  companyName?: string | null;

  @ApiPropertyOptional({ example: 'VAT123456789' })
  taxId?: string | null;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string | null;

  @ApiProperty({ example: '+1-555-123-4567' })
  phone: string;

  @ApiPropertyOptional({ example: '+1-555-987-6543' })
  alternatePhone?: string | null;

  @ApiProperty({ enum: CustomerStatus, example: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @ApiProperty({ example: ['VIP', 'wholesale'], type: [String] })
  tags: string[];

  @ApiPropertyOptional({ example: 'Important customer' })
  notes?: string | null;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiPropertyOptional({ example: 'uuid' })
  createdById?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}

/**
 * Customer with addresses (for detail endpoints)
 */
export class CustomerWithAddressesResponseDto extends CustomerResponseDto {
  @ApiProperty({ type: [CustomerAddressResponseDto] })
  addresses: CustomerAddressResponseDto[];
}

/**
 * Customer with address count (for list endpoints)
 */
export class CustomerListItemResponseDto extends CustomerResponseDto {
  @ApiProperty({
    example: { addresses: 2 },
    description: 'Count of addresses',
  })
  _count: { addresses: number };
}
