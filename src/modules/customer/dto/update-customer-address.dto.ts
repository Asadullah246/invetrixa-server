import { PartialType } from '@nestjs/swagger';
import { CreateCustomerAddressDto } from './create-customer-address.dto';

/**
 * DTO for updating an existing customer address
 * All fields are optional
 */
export class UpdateCustomerAddressDto extends PartialType(
  CreateCustomerAddressDto,
) {}
