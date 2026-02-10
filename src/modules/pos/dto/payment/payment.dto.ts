import { EnumField, NumberField, StringField } from '@/common/decorator/fields';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from 'generated/prisma/client';

export class PaymentDto {
  @EnumField('Payment Method', PaymentMethod, { required: true })
  method: PaymentMethod;

  @NumberField('Payment Amount', { required: true, min: 0, example: 100.0 })
  amount: number;

  @StringField('Transaction Reference', { required: false })
  transactionRef?: string;

  @StringField('Notes', { required: false })
  notes?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty()
  amount: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional()
  transactionRef?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  processedAt: Date;

  @ApiProperty()
  processedByName: string;
}
