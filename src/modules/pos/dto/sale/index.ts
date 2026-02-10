import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  StringField,
  UUIDField,
  NumberField,
  EnumField,
} from '@/common/decorator/fields';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import {
  SaleStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/client';

// ==================== SALE ITEM ====================

export class CreateSaleItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', {
    required: true,
    min: 0.0001,
    example: 2,
  })
  quantity: number;

  @NumberField('Unit Price (override)', {
    required: false,
    min: 0,
    example: 150.0,
  })
  unitPrice?: number;

  @NumberField('Discount Amount per item', {
    required: false,
    min: 0,
    example: 10.0,
  })
  discountAmount?: number;

  @StringField('Notes', { required: false, max: 255 })
  notes?: string;
}

// ==================== PAYMENT ====================

export class CreatePaymentDto {
  @EnumField('Payment Method', PaymentMethod, { required: true })
  method: PaymentMethod;

  @NumberField('Amount', {
    required: true,
    min: 0.01,
    example: 500.0,
  })
  amount: number;

  @StringField('Transaction Reference', { required: false, max: 100 })
  transactionRef?: string;

  @StringField('Notes', { required: false, max: 255 })
  notes?: string;
}

// ==================== CREATE SALE ====================

export class CreateSaleDto {
  @UUIDField('Location ID', { required: true })
  locationId: string;

  @UUIDField('Session ID', { required: false })
  sessionId?: string;

  @UUIDField('Terminal ID', { required: false })
  terminalId?: string;

  @UUIDField('Customer ID', { required: false })
  customerId?: string;

  @ApiProperty({
    description: 'Sale items',
    type: [CreateSaleItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({
    description: 'Payments (supports split payments)',
    type: [CreatePaymentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments: CreatePaymentDto[];

  @NumberField('Overall Discount Amount', {
    required: false,
    min: 0,
    example: 50.0,
  })
  discountAmount?: number;

  @StringField('Notes', { required: false, max: 500 })
  notes?: string;
}

// ==================== QUERY ====================

export class QuerySaleDto extends PaginationQueryDto {
  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @UUIDField('Terminal ID', { required: false })
  terminalId?: string;

  @UUIDField('Session ID', { required: false })
  sessionId?: string;

  @UUIDField('Customer ID', { required: false })
  customerId?: string;

  @EnumField('Status', SaleStatus, { required: false })
  status?: SaleStatus;

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

class CustomerSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  phone?: string | null;
}

class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Main Store' })
  name: string;
}

class ProductSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Product Name' })
  name: string;

  @ApiProperty({ example: 'SKU-001' })
  sku: string;
}

class CashierSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;
}

export class SaleItemResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ type: ProductSummary })
  product: ProductSummary;

  @ApiProperty({ example: '2.0000' })
  quantity: string;

  @ApiProperty({ example: '150.0000' })
  unitPrice: string;

  @ApiProperty({ example: '10.0000' })
  discountAmount: string;

  @ApiProperty({ example: '290.0000' })
  lineTotal: string;

  @ApiPropertyOptional({ example: 'Gift wrap requested' })
  notes?: string | null;
}

export class SalePaymentResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  method: PaymentMethod;

  @ApiProperty({ example: '500.0000' })
  amount: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  @ApiPropertyOptional({ example: 'TRX123456' })
  transactionRef?: string | null;
  @ApiPropertyOptional({ example: 'bKash payment' })
  notes?: string | null;
}

export class SaleResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'INV-2024-00001' })
  invoiceNumber: string;

  @ApiProperty({ enum: SaleStatus, example: SaleStatus.COMPLETED })
  status: SaleStatus;

  @ApiProperty({ example: '1000.0000' })
  subtotal: string;

  @ApiProperty({ example: '50.0000' })
  discountAmount: string;

  @ApiProperty({ example: '0.0000' })
  taxAmount: string;

  @ApiProperty({ example: '950.0000' })
  totalAmount: string;

  @ApiProperty({ example: '950.0000' })
  paidAmount: string;

  @ApiProperty({ example: '0.0000' })
  changeAmount: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  // Flattened for list view
  @ApiProperty({ example: 'Main Store' })
  locationName: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  customerName?: string | null;

  @ApiProperty({ example: 'Jane Doe' })
  cashierName: string;

  @ApiProperty({ example: 3 })
  itemCount: number;
}

export class SaleDetailResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'INV-2024-00001' })
  invoiceNumber: string;

  @ApiProperty({ enum: SaleStatus, example: SaleStatus.COMPLETED })
  status: SaleStatus;

  @ApiProperty({ example: '1000.0000' })
  subtotal: string;

  @ApiProperty({ example: '50.0000' })
  discountAmount: string;

  @ApiProperty({ example: '0.0000' })
  taxAmount: string;

  @ApiProperty({ example: '950.0000' })
  totalAmount: string;

  @ApiProperty({ example: '950.0000' })
  paidAmount: string;

  @ApiProperty({ example: '0.0000' })
  changeAmount: string;

  @ApiPropertyOptional({ example: 'Customer requested rush delivery' })
  notes?: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: LocationSummary })
  location: LocationSummary;

  @ApiPropertyOptional({ type: CustomerSummary })
  customer?: CustomerSummary | null;

  @ApiProperty({ type: CashierSummary })
  cashier: CashierSummary;

  @ApiProperty({ type: [SaleItemResponseDto] })
  items: SaleItemResponseDto[];

  @ApiProperty({ type: [SalePaymentResponseDto] })
  payments: SalePaymentResponseDto[];
}

export * from './complete-sale.dto';
