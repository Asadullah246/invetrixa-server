import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO for updating an existing customer
 * All fields are optional, addresses are managed separately via address endpoints
 */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['addresses'] as const),
) {}
