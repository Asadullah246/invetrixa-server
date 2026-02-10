import { IsArray, ValidateNested } from 'class-validator';
import { StringField } from '@/common/decorator/fields';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentDto } from '../payment/payment.dto';

export class CompleteSaleDto {
  @ApiProperty({ type: [PaymentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @StringField('Notes', { required: false })
  notes?: string;
}
