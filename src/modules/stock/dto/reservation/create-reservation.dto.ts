import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString } from 'class-validator';
import { StringField, UUIDField, NumberField } from '@/common/decorator/fields';

export class CreateReservationDto {
  @UUIDField('Product ID', { required: true })
  productId: string;

  @UUIDField('Location ID', { required: true })
  locationId: string;

  @NumberField('Quantity', {
    required: true,
    min: 1,
    integer: true,
    example: 5,
  })
  quantity: number;

  @ApiProperty({
    description: 'Expiration date (ISO 8601)',
    example: '2024-01-07T15:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  expiresAt: string;

  @StringField('Reference Type', {
    required: false,
    max: 50,
    example: 'CART',
  })
  referenceType?: string;

  @StringField('Reference ID', {
    required: false,
    max: 100,
    example: 'cart-uuid',
  })
  referenceId?: string;
}
