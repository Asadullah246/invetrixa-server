import {
  NumberField,
  EnumField,
  StringField,
  UUIDField,
} from '@/common/decorator/fields';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { PaymentMethod, PaymentStatus } from 'generated/prisma/client';

export class RefundItemDto {
  @UUIDField('Sale Item ID', { required: true })
  saleItemId: string;

  @NumberField('Quantity to refund', { required: true, min: 1 })
  quantity: number;
}

export class CreateRefundDto {
  @NumberField('Refund Amount', { required: true, min: 0, example: 50.0 })
  amount: number;

  @EnumField('Refund Method', PaymentMethod, { required: true })
  method: PaymentMethod;

  @StringField('Refund Reason', { required: true })
  reason: string;

  @ApiPropertyOptional({ type: [RefundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  @IsOptional()
  items?: RefundItemDto[];
}

export class RefundResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  refundNumber: string;

  @ApiProperty()
  amount: string;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  saleId: string;

  @ApiProperty()
  processedAt: Date;

  @ApiProperty()
  processedByName: string;
}
