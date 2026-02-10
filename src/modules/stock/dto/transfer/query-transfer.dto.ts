import { TransferStatus } from 'generated/prisma/client';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { UUIDField, EnumField } from '@/common/decorator/fields';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class QueryTransferDto extends PaginationQueryDto {
  @UUIDField('From Location ID', { required: false })
  fromLocationId?: string;

  @UUIDField('To Location ID', { required: false })
  toLocationId?: string;

  @EnumField('Transfer Status', TransferStatus, { required: false })
  status?: TransferStatus;

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
