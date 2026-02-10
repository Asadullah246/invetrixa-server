import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { NumberField } from '@/common/decorator/fields/number-field.decorator';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';

export enum SortType {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Base pagination query DTO with common fields for all list endpoints
 */
export class PaginationQueryDto {
  @NumberField('Page', {
    required: true,
    min: 1,
    integer: true,
    example: 1,
  })
  page: number;

  @NumberField('Limit', {
    required: true,
    min: 1,
    max: 100,
    integer: true,
    example: 10,
  })
  limit: number;

  @EnumField('Sort Order', SortType, { required: false })
  sort?: SortType;

  @StringField('Sort By', {
    required: false,
    example: 'createdAt',
  })
  sortBy?: string;

  @StringField('Search', {
    required: false,
    example: '',
  })
  search?: string;
}
