import { StringField } from '@/common/decorator/fields';

/**
 * DTO for shipping a transfer
 * Ship uses requestedQuantity as shippedQuantity automatically
 */
export class ShipTransferDto {
  @StringField('Note', {
    required: false,
    max: 500,
    example: 'Shipped via truck',
  })
  note?: string;
}
