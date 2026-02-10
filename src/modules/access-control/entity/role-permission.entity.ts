import { ApiProperty } from '@nestjs/swagger';

// Nested entity for module reference in permissions
export class ModuleRefSummaryEntity {
  @ApiProperty({
    description: 'Name of the module',
    example: 'Product',
  })
  name: string;
}

// Permission with module info for role response
export class RolePermissionSummaryEntity {
  @ApiProperty({
    description: 'Actions allowed on the resource',
    type: [String],
    isArray: true,
    example: ['products.create', 'stock.adjust'],
  })
  actions: string[];

  @ApiProperty({
    description: 'Module reference information',
    type: ModuleRefSummaryEntity,
  })
  moduleRef: ModuleRefSummaryEntity;
}
