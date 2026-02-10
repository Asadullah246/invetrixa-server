import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolePermissionSummaryEntity } from './role-permission.entity';

export class RoleEntity {
  @ApiProperty({
    description: 'Unique identifier for the role',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the role',
    example: 'Manager',
    maxLength: 50,
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Role responsible for managing team operations',
    maxLength: 255,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Tenant ID this role belongs to',
    example: 'tenant_abc123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Timestamp when the role was created',
    example: '2025-11-19T07:32:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Permissions associated with this role',
    type: [RolePermissionSummaryEntity],
    isArray: true,
  })
  rolePermissions: RolePermissionSummaryEntity[];
}
