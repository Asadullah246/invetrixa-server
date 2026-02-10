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
  DocumentType,
  DocumentStatus,
  PaymentMethod,
} from 'generated/prisma/client';

// ==================== INVOICE ITEM ====================

export class CreateInvoiceItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', {
    required: true,
    min: 1,
    example: 10,
  })
  quantity: number;

  @NumberField('Unit Price', {
    required: true,
    min: 0,
    example: 150.0,
  })
  unitPrice: number;

  @NumberField('Discount Amount per item', {
    required: false,
    min: 0,
    example: 10.0,
  })
  discountAmount?: number;

  @NumberField('Tax Amount per item', {
    required: false,
    min: 0,
    example: 5.0,
  })
  taxAmount?: number;

  @StringField('Notes', { required: false, max: 255 })
  notes?: string;

  @NumberField('Sort Order', { required: false, min: 0 })
  sortOrder?: number;
}

export class UpdateInvoiceItemDto {
  @UUIDField('Item ID', { required: true })
  id: string;

  @NumberField('Quantity', { required: false, min: 1, example: 10 })
  quantity?: number;

  @NumberField('Unit Price', { required: false, min: 0, example: 150.0 })
  unitPrice?: number;

  @NumberField('Discount Amount', { required: false, min: 0 })
  discountAmount?: number;

  @NumberField('Tax Amount', { required: false, min: 0 })
  taxAmount?: number;

  @StringField('Notes', { required: false, max: 255 })
  notes?: string;

  @NumberField('Sort Order', { required: false, min: 0 })
  sortOrder?: number;
}

// ==================== INVOICE PAYMENT ====================

export class CreateInvoicePaymentDto {
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

  @ApiPropertyOptional({
    description: 'Payment Date (defaults to now)',
    example: '2026-02-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @StringField('Notes', { required: false, max: 255 })
  notes?: string;
}

// ==================== CREATE INVOICE ====================

export class CreateInvoiceDto {
  @EnumField('Document Type', DocumentType, { required: true })
  documentType: DocumentType;

  @UUIDField('Location ID', { required: true })
  locationId: string;

  @UUIDField('Customer ID', { required: true })
  customerId: string;

  @StringField('Subject/Title', { required: false, max: 255 })
  subject?: string;

  @ApiProperty({
    description: 'Invoice items',
    type: [CreateInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @NumberField('Overall Discount Amount', {
    required: false,
    min: 0,
    example: 50.0,
  })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Due Date for payment (ISO 8601)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Quote validity date (ISO 8601)',
    example: '2026-02-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @StringField('Payment Terms', { required: false, max: 100 })
  paymentTerms?: string;

  @StringField('Internal Notes', { required: false, max: 1000 })
  notes?: string;

  @StringField('Customer-visible Notes', { required: false, max: 1000 })
  customerNotes?: string;

  @StringField('Terms & Conditions', { required: false })
  termsConditions?: string;
}

// ==================== UPDATE INVOICE ====================

export class UpdateInvoiceDto {
  @StringField('Subject/Title', { required: false, max: 255 })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Updated items',
    type: [UpdateInvoiceItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  items?: UpdateInvoiceItemDto[];

  @NumberField('Overall Discount Amount', { required: false, min: 0 })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Due Date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Quote validity date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @StringField('Payment Terms', { required: false, max: 100 })
  paymentTerms?: string;

  @StringField('Internal Notes', { required: false, max: 1000 })
  notes?: string;

  @StringField('Customer-visible Notes', { required: false, max: 1000 })
  customerNotes?: string;

  @StringField('Terms & Conditions', { required: false })
  termsConditions?: string;
}

// ==================== QUERY ====================

export class QueryInvoiceDto extends PaginationQueryDto {
  @EnumField('Document Type', DocumentType, { required: false })
  documentType?: DocumentType;

  @EnumField('Status', DocumentStatus, { required: false })
  status?: DocumentStatus;

  @UUIDField('Customer ID', { required: false })
  customerId?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ==================== RESPONSE DTOs ====================

class CustomerSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ABC Company' })
  name: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'contact@abc.com' })
  email?: string | null;
}

class LocationSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Main Warehouse' })
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

export class InvoiceItemResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ type: ProductSummary })
  product: ProductSummary;

  @ApiProperty({ example: 'Product Name' })
  productName: string;

  @ApiProperty({ example: 'SKU-001' })
  productSku: string;

  @ApiProperty({ example: 10 })
  quantity: number;

  @ApiProperty({ example: '150.0000' })
  unitPrice: string;

  @ApiProperty({ example: '10.0000' })
  discountAmount: string;

  @ApiProperty({ example: '5.0000' })
  taxAmount: string;

  @ApiProperty({ example: '1495.0000' })
  lineTotal: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

export class InvoicePaymentResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  method: PaymentMethod;

  @ApiProperty({ example: '500.0000' })
  amount: string;

  @ApiPropertyOptional({ example: 'TRX123456' })
  transactionRef?: string | null;

  @ApiProperty({ example: '2026-02-01T10:00:00.000Z' })
  paymentDate: Date;

  @ApiPropertyOptional()
  notes?: string | null;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'INV-2026-00001' })
  documentNumber: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.INVOICE })
  documentType: DocumentType;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.SENT })
  status: DocumentStatus;

  @ApiPropertyOptional({ example: 'Office Supplies Order' })
  subject?: string | null;

  @ApiProperty({ example: '1000.0000' })
  subtotal: string;

  @ApiProperty({ example: '50.0000' })
  discountAmount: string;

  @ApiProperty({ example: '0.0000' })
  taxAmount: string;

  @ApiProperty({ example: '950.0000' })
  totalAmount: string;

  @ApiProperty({ example: '500.0000' })
  paidAmount: string;

  @ApiProperty({ example: '450.0000' })
  dueAmount: string;

  @ApiProperty({ example: '2026-02-01T10:30:00.000Z' })
  issueDate: Date;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  dueDate?: Date | null;

  // Flattened for list view
  @ApiProperty({ example: 'ABC Company' })
  customerName: string;

  @ApiProperty({ example: 'Main Warehouse' })
  locationName: string;

  @ApiProperty({ example: 5 })
  itemCount: number;
}

export class InvoiceDetailResponseDto extends InvoiceResponseDto {
  @ApiPropertyOptional({ example: 'Net 30' })
  paymentTerms?: string | null;

  @ApiPropertyOptional({ example: '2026-02-15T00:00:00.000Z' })
  validUntil?: Date | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  customerNotes?: string | null;

  @ApiPropertyOptional()
  termsConditions?: string | null;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiPropertyOptional()
  acceptedAt?: Date | null;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiProperty({ type: CustomerSummary })
  customer: CustomerSummary;

  @ApiProperty({ type: LocationSummary })
  location: LocationSummary;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiProperty({ type: [InvoicePaymentResponseDto] })
  payments: InvoicePaymentResponseDto[];
}
