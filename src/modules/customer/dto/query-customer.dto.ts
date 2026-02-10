import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';
import { CustomerStatus, CustomerType } from 'generated/prisma/enums';

/**
 * Query parameters for filtering and paginating customers
 * Note: search, page, limit, sort, sortBy are inherited from PaginationQueryDto
 */
export class QueryCustomerDto extends PaginationQueryDto {
  @EnumField('Customer Type', CustomerType, { required: false })
  customerType?: CustomerType;

  @EnumField('Status', CustomerStatus, { required: false })
  status?: CustomerStatus;

  @StringField('Tag filter', { required: false })
  tag?: string;
}
