import { NumberField, StringField } from '@/common/decorator/fields';

/**
 * DTO for adding a new item to cart
 */
export class AddCartItemDto {
  @StringField('Product ID', { required: true })
  productId: string;

  @NumberField('Quantity', { required: true, min: 1, example: 1 })
  quantity: number;

  @NumberField('Custom unit price (overrides product price)', {
    required: false,
    min: 0,
    example: 100.5,
  })
  unitPrice?: number;

  @NumberField('Discount amount for this line item', {
    required: false,
    min: 0,
    example: 0,
  })
  discountAmount?: number;

  @StringField('Notes for the item', { required: false, example: 'No sugar' })
  notes?: string;
}

/**
 * DTO for updating an existing cart item (productId not needed - item already exists)
 */
export class UpdateCartItemDto {
  @NumberField('Quantity', { required: true, min: 1, example: 2 })
  quantity: number;

  @NumberField('Custom unit price (overrides product price)', {
    required: false,
    min: 0,
    example: 100.5,
  })
  unitPrice?: number;

  @NumberField('Discount amount for this line item', {
    required: false,
    min: 0,
    example: 0,
  })
  discountAmount?: number;

  @StringField('Notes for the item', { required: false, example: 'No sugar' })
  notes?: string;
}

// Keep backward compatibility alias
export { AddCartItemDto as CartItemDto };
