import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';
import { StringArrayField } from '@/common/decorator/fields/string-array-field.decorator';
import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from 'generated/prisma/enums';
import { CreateCustomerAddressDto } from './create-customer-address.dto';

/**
 * DTO for creating a new customer
 */
export class CreateCustomerDto {
  @EnumField('Customer Type', CustomerType, { required: false })
  customerType?: CustomerType;

  // Individual fields
  @StringField('First Name', { required: false, max: 100, example: 'John' })
  firstName?: string;

  @StringField('Last Name', { required: false, max: 100, example: 'Doe' })
  lastName?: string;

  // Business fields
  @StringField('Company Name', {
    required: false,
    max: 255,
    example: 'Acme Inc',
  })
  companyName?: string;

  @StringField('Tax ID', {
    required: false,
    max: 50,
    example: 'VAT123456789',
  })
  taxId?: string;

  // Contact
  @StringField('Email', {
    required: false,
    max: 255,
    example: 'john@example.com',
  })
  email?: string;

  @StringField('Phone', { required: true, max: 50, example: '+1234567890' })
  phone: string;

  @StringField('Alternate Phone', {
    required: false,
    max: 50,
    example: '+1987654321',
  })
  alternatePhone?: string;

  // Tags & Notes
  @StringArrayField('Tags', { required: false, example: ['VIP', 'wholesale'] })
  tags?: string[];

  @StringField('Notes', { required: false, example: 'Regular customer' })
  notes?: string;

  // Addresses (optional on create)
  @ApiPropertyOptional({ type: [CreateCustomerAddressDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerAddressDto)
  addresses?: CreateCustomerAddressDto[];
}
