import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { StringField } from '@/common/decorator/fields';
import { PermissionUpdateDto } from './update-role.dto';

export class CreateRoleDto {
  @StringField('Name', {
    min: 1,
    max: 50,
    example: 'Manager',
  })
  name: string;

  @StringField('Description', {
    min: 1,
    max: 255,
    example: 'Role responsible for managing team operations',
    required: false,
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Initial permissions for this role',
    type: [PermissionUpdateDto],
    isArray: true,
    example: [
      {
        moduleRefId: 'module-uuid-123',
        actions: ['product.view', 'product.create'],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionUpdateDto)
  permissions?: PermissionUpdateDto[];
}
