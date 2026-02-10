import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';
import { BooleanField } from '@/common/decorator/fields/boolean-field.decorator';
import { AddressType } from 'generated/prisma/enums';

/**
 * DTO for adding a new address to a customer
 */
export class CreateCustomerAddressDto {
  @EnumField('Address Type', AddressType, { required: false })
  addressType?: AddressType;

  @StringField('Label', { required: false, max: 100, example: 'Home' })
  label?: string;

  @BooleanField('Is Default Address', { required: false })
  isDefault?: boolean;

  @StringField('Address Line 1', { required: false, max: 255 })
  addressLine1?: string;

  @StringField('Address Line 2', { required: false, max: 255 })
  addressLine2?: string;

  @StringField('City', { required: false, max: 100 })
  city?: string;

  @StringField('State', { required: false, max: 100 })
  state?: string;

  @StringField('Postal Code', { required: false, max: 20 })
  postalCode?: string;

  @StringField('Country', { required: false, max: 100 })
  country?: string;
}
