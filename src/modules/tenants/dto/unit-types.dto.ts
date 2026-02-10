import { ApiProperty } from '@nestjs/swagger';
import { StringArrayField } from '@/common/decorator/fields';

/**
 * DTO for creating/updating unit types
 */
export class UpsertUnitTypesDto {
  @StringArrayField('Unit Type Values', {
    required: true,
    example: ['PIECE', 'KG', 'BOX', 'LITER'],
  })
  values: string[];
}

/**
 * Response DTO for unit types
 */
export class UnitTypesResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({
    example: ['PIECE', 'KG', 'BOX', 'LITER'],
    description: 'Available unit types for this tenant',
  })
  values: string[];

  @ApiProperty({ example: 'tenant-uuid', nullable: true })
  tenantId: string | null;
}
