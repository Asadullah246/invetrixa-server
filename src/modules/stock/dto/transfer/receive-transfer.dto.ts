import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { UUIDField, NumberField, StringField } from '@/common/decorator/fields';

export class ReceiveItemDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @NumberField('Received Quantity', {
    required: true,
    min: 0,
    integer: true,
    example: 50,
  })
  receivedQuantity: number;

  @StringField('Shortage Reason', {
    required: false,
    max: 255,
    example: 'Damaged during transit',
  })
  shortageReason?: string;
}

export class ReceiveTransferDto {
  @ApiProperty({
    description: 'Items received with actual quantities',
    type: [ReceiveItemDto],
    example: [
      { productId: 'uuid', receivedQuantity: 50 },
      {
        productId: 'uuid2',
        receivedQuantity: 45,
        shortageReason: 'Damaged during transit',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @StringField('Note', {
    required: false,
    max: 500,
    example: 'All items received in good condition',
  })
  note?: string;
}
