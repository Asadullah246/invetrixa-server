import { StringField } from '@/common/decorator/fields/string-field.decorator';

/**
 * DTO for creating a new supplier
 */
export class CreateSupplierDto {
  @StringField('Supplier Name', {
    required: true,
    max: 255,
    example: 'Acme Supplies Ltd.',
  })
  name: string;

  @StringField('Email Address', {
    required: false,
    max: 255,
    example: 'contact@acmesupplies.com',
  })
  email?: string;

  @StringField('Phone Number', {
    required: false,
    max: 50,
    example: '+1-555-123-4567',
  })
  phone?: string;

  @StringField('Address', {
    required: false,
    example: '123 Industrial Blvd, Suite 456, New York, NY 10001',
  })
  address?: string;

  @StringField('Contact Person Name', {
    required: false,
    max: 255,
    example: 'John Smith',
  })
  contactName?: string;

  @StringField('Additional Notes', {
    required: false,
    example: 'Preferred supplier for electronics',
  })
  notes?: string;
}
