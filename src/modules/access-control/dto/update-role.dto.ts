import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import {
  StringField,
  UUIDField,
  StringArrayField,
} from '@/common/decorator/fields';

/**
 * Nested DTO for permission in role update
 */
export class PermissionUpdateDto {
  @UUIDField('Module Reference ID', {
    required: true,
    example: 'module-uuid-123',
  })
  moduleRefId: string;

  @StringArrayField('Actions', {
    required: true,
    minItems: 1,
    example: ['product.view', 'product.create'],
  })
  actions: string[];
}

/**
 * DTO for updating role with optional permissions
 * Permissions update replaces all existing permissions
 */
export class UpdateRoleDto {
  @StringField('Name', {
    min: 1,
    max: 50,
    example: 'Senior Manager',
    required: false,
  })
  name?: string;

  @StringField('Description', {
    max: 255,
    example: 'Role with elevated permissions',
    required: false,
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Permissions to set for this role (replaces existing)',
    type: [PermissionUpdateDto],
    isArray: true,
    example: [
      {
        moduleRefId: 'module-uuid-123',
        actions: ['product.view', 'product.create'],
      },
      {
        moduleRefId: 'module-uuid-456',
        actions: ['user.view'],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionUpdateDto)
  permissions?: PermissionUpdateDto[];
}
