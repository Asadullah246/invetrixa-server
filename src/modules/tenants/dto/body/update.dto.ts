import { PartialType } from '@nestjs/swagger';
import { TenantCreationDto } from './tenant-creation.dto';

export class tenantUpdateDto extends PartialType(TenantCreationDto) {}
