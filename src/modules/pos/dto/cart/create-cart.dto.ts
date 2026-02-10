import { UUIDField, StringField } from '@/common/decorator/fields';

export class CreateCartDto {
  @UUIDField('Location ID where the cart is created', { required: true })
  locationId: string;

  @UUIDField('Terminal ID (optional for initial cart creation)', {
    required: false,
  })
  terminalId?: string;

  @UUIDField('Customer ID', { required: false })
  customerId?: string;

  @UUIDField('POS Session ID', { required: false })
  sessionId?: string;

  @StringField('Notes for the cart/sale', {
    required: false,
    example: 'Customer request...',
  })
  notes?: string;
}
