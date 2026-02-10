import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StringField,
  UUIDField,
  BooleanField,
} from '@/common/decorator/fields';
import { PaginationQueryDto } from '@/common/dto/query/pagination';

// ==================== CREATE ====================

export class CreateTerminalDto {
  @StringField('Terminal Name', {
    required: true,
    min: 2,
    max: 100,
    example: 'Register 1',
  })
  name: string;

  @StringField('Terminal Code', {
    required: true,
    min: 2,
    max: 20,
    example: 'POS-001',
  })
  code: string;

  @UUIDField('Location ID', { required: true })
  locationId: string;
}

// ==================== UPDATE ====================

export class UpdateTerminalDto {
  @StringField('Terminal Name', {
    required: false,
    min: 2,
    max: 100,
    example: 'Register 1',
  })
  name?: string;

  @StringField('Terminal Code', {
    required: false,
    min: 2,
    max: 20,
    example: 'POS-001',
  })
  code?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @BooleanField('Is Active', { required: false })
  isActive?: boolean;
}

// ==================== QUERY ====================

export class QueryTerminalDto extends PaginationQueryDto {
  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @BooleanField('Is Active', { required: false })
  isActive?: boolean;
}

// ==================== RESPONSE ====================

class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Main Warehouse' })
  name: string;

  @ApiPropertyOptional({ example: 'WH-01' })
  code?: string | null;
}

class UserSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

export class TerminalResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Register 1' })
  name: string;

  @ApiProperty({ example: 'POS-001' })
  code: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'uuid' })
  locationId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class TerminalWithLocationResponseDto extends TerminalResponseDto {
  @ApiProperty({ type: LocationSummary })
  location: LocationSummary;

  @ApiPropertyOptional({ type: UserSummary, nullable: true })
  createdBy?: UserSummary | null;
}
