import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { NumberField, StringField } from '@/common/decorator/fields';

/**
 * DTO for updating an existing stock reservation.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateReservationDto {
  @NumberField('Quantity', {
    required: false,
    min: 1,
    integer: true,
    example: 10,
  })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'New expiration date (ISO 8601)',
    example: '2024-01-07T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

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
