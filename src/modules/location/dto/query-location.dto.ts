import {
  LocationType,
  LocationSubType,
  LocationStatus,
} from 'generated/prisma/client';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';

/**
 * Query parameters for filtering locations
 */
export class QueryLocationDto extends PaginationQueryDto {
  @EnumField('Filter by Status', LocationStatus, { required: false })
  status?: LocationStatus;

  @EnumField('Filter by Type', LocationType, { required: false })
  type?: LocationType;

  @EnumField('Filter by Sub-Type', LocationSubType, { required: false })
  subType?: LocationSubType;
}
