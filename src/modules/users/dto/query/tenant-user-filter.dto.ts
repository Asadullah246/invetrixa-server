import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import {
  StringField,
  BooleanField,
  UUIDField,
} from '@/common/decorator/fields';

/**
 * Filter DTO for fetching users within a tenant context.
 * Supports filtering by user fields, roles, and date ranges.
 */
export class TenantUserFilterDto extends PaginationQueryDto {
  // ─────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────

  // Note: `search` is inherited from PaginationQueryDto

  // ─────────────────────────────────────────────────────────────
  // User Field Filters
  // ─────────────────────────────────────────────────────────────

  @StringField('Name', {
    required: false,
    example: 'John',
  })
  name?: string;

  @StringField('Email', {
    required: false,
    example: 'john@example.com',
  })
  email?: string;

  @StringField('Phone Number', {
    required: false,
    example: '+1',
  })
  phoneNumber?: string;

  @BooleanField('Is Active', { required: false, example: true })
  isActive?: boolean;

  @BooleanField('Email Verified', { required: false, example: true })
  emailVerified?: boolean;

  // ─────────────────────────────────────────────────────────────
  // Relation Filters
  // ─────────────────────────────────────────────────────────────

  @UUIDField('Role ID', { required: false })
  roleId?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;

  // ─────────────────────────────────────────────────────────────
  // Date Range Filters
  // ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Filter users created from this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter users created until this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdTo?: Date;

  @ApiPropertyOptional({
    description: 'Filter users last active from this date',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastActiveFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter users last active until this date',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastActiveTo?: Date;
}
