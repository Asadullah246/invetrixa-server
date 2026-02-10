import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base supplier response DTO
 */
export class SupplierResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Acme Supplies Ltd.' })
  name: string;

  @ApiPropertyOptional({ example: 'contact@acmesupplies.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  phone?: string | null;

  @ApiPropertyOptional({
    example: '123 Industrial Blvd, Suite 456, New York, NY 10001',
  })
  address?: string | null;

  @ApiPropertyOptional({ example: 'John Smith' })
  contactName?: string | null;

  @ApiPropertyOptional({ example: 'Preferred supplier for electronics' })
  notes?: string | null;

  @ApiProperty({ example: 'uuid' })
  tenantId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}

/**
 * Supplier with batch count (for list endpoints)
 */
export class SupplierWithCountResponseDto extends SupplierResponseDto {
  @ApiProperty({
    example: { batches: 5 },
    description: 'Number of batches from this supplier',
  })
  _count: { batches: number };
}
