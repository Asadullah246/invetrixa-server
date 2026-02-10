import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StringField, UUIDField, NumberField } from '@/common/decorator/fields';
import { TransferStatus } from 'generated/prisma/client';

export class TransferItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Requested Quantity', {
    required: true,
    min: 1,
    integer: true,
    example: 50,
  })
  requestedQuantity: number;
}

export class CreateTransferDto {
  @UUIDField('Source Location ID', { required: true })
  fromLocationId: string;

  @UUIDField('Destination Location ID', { required: true })
  toLocationId: string;

  @ApiProperty({
    description: 'Items to transfer',
    type: [TransferItemDto],
    example: [{ productId: 'uuid', requestedQuantity: 50 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiPropertyOptional({
    description:
      'Initial status (DRAFT or IN_TRANSIT). If IN_TRANSIT, transfer will be shipped immediately.',
    enum: [TransferStatus.DRAFT, TransferStatus.IN_TRANSIT],
    default: TransferStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'Weekly restock for branch B',
  })
  note?: string;
}
