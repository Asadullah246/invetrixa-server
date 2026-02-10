import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';

/**
 * DTO for updating a supplier (all fields optional)
 */
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
