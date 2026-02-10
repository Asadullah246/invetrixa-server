import { PaginationQueryDto } from '@/common/dto/query/pagination';
import {
  StockMovementType,
  StockMovementStatus,
  StockReferenceType,
} from 'generated/prisma/client';
import { EnumField, UUIDField } from '@/common/decorator/fields';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

/**
 * Query DTO for filtering and paginating stock movements
 * Note: `search` field is inherited from PaginationQueryDto
 */
export class QueryMovementDto extends PaginationQueryDto {
  @UUIDField('Product ID', { required: false })
  productId?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @EnumField('Movement Type', StockMovementType, { required: false })
  movementType?: StockMovementType;

  @EnumField('Status', StockMovementStatus, { required: false })
  status?: StockMovementStatus;

  @EnumField('Reference Type', StockReferenceType, { required: false })
  referenceType?: StockReferenceType;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
