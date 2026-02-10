import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import {
  StringField,
  UUIDField,
  NumberField,
  EnumField,
} from '@/common/decorator/fields';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { POSSessionStatus } from 'generated/prisma/client';

// ==================== OPEN SESSION ====================

export class OpenSessionDto {
  @UUIDField('Terminal ID', { required: true })
  terminalId: string;

  @NumberField('Opening Cash Balance', {
    required: true,
    min: 0,
    example: 5000,
  })
  openingBalance: number;

  @ApiPropertyOptional({
    description: 'Cash denomination count',
    example: { '1000': 3, '500': 4, '100': 10 },
  })
  openingCount?: Record<string, number>;

  @StringField('Notes', { required: false, max: 500 })
  notes?: string;
}

// ==================== CLOSE SESSION ====================

export class CloseSessionDto {
  @NumberField('Actual Closing Cash Balance', {
    required: true,
    min: 0,
    example: 15000,
  })
  closingBalance: number;

  @ApiPropertyOptional({
    description: 'Cash denomination count',
    example: { '1000': 10, '500': 8, '100': 20 },
  })
  closingCount?: Record<string, number>;

  @StringField('Notes', { required: false, max: 500 })
  notes?: string;
}

// ==================== QUERY ====================

export class QuerySessionDto extends PaginationQueryDto {
  @UUIDField('Terminal ID', { required: false })
  terminalId?: string;

  @EnumField('Status', POSSessionStatus, { required: false })
  status?: POSSessionStatus;

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

// ==================== RESPONSE ====================

class UserSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

class TerminalSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Register 1' })
  name: string;

  @ApiProperty({ example: 'POS-001' })
  code: string;
}

export class SessionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'SES-2024-00001' })
  sessionNumber: string;

  @ApiProperty({ example: 5000 })
  openingBalance: string;

  @ApiPropertyOptional({ example: 15000, nullable: true })
  closingBalance?: string | null;

  @ApiPropertyOptional({ example: 15500, nullable: true })
  expectedBalance?: string | null;

  @ApiPropertyOptional({ example: -500, nullable: true })
  variance?: string | null;

  @ApiProperty({ enum: POSSessionStatus, example: POSSessionStatus.OPEN })
  status: POSSessionStatus;

  @ApiProperty({ example: '2024-01-01T09:00:00.000Z' })
  openedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-01T18:00:00.000Z', nullable: true })
  closedAt?: Date | null;

  // Flattened for list view
  @ApiProperty({ example: 'Register 1' })
  terminalName: string;

  @ApiProperty({ example: 'John Doe' })
  openedBy: string;

  @ApiPropertyOptional({ example: 'Jane Doe', nullable: true })
  closedBy?: string | null;
}

export class SessionDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'SES-2024-00001' })
  sessionNumber: string;

  @ApiProperty({ example: '5000.0000' })
  openingBalance: string;

  @ApiPropertyOptional({ example: '15000.0000', nullable: true })
  closingBalance?: string | null;

  @ApiPropertyOptional({ example: '15500.0000', nullable: true })
  expectedBalance?: string | null;

  @ApiPropertyOptional({ example: '-500.0000', nullable: true })
  variance?: string | null;

  @ApiProperty({ enum: POSSessionStatus, example: POSSessionStatus.OPEN })
  status: POSSessionStatus;

  @ApiProperty({ example: '2024-01-01T09:00:00.000Z' })
  openedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-01T18:00:00.000Z', nullable: true })
  closedAt?: Date | null;

  @ApiPropertyOptional({ example: { '1000': 3, '500': 4 }, nullable: true })
  openingCount?: Record<string, number> | null;

  @ApiPropertyOptional({ example: { '1000': 10, '500': 8 }, nullable: true })
  closingCount?: Record<string, number> | null;

  @ApiPropertyOptional({ example: 'Shift notes', nullable: true })
  notes?: string | null;

  @ApiProperty({ type: TerminalSummary })
  terminal: TerminalSummary;

  @ApiProperty({ type: UserSummary })
  openedByUser: UserSummary;

  @ApiPropertyOptional({ type: UserSummary, nullable: true })
  closedByUser?: UserSummary | null;

  // Summary statistics
  @ApiProperty({ example: 25 })
  totalSales: number;

  @ApiProperty({ example: '10500.0000' })
  totalCashReceived: string;
}
