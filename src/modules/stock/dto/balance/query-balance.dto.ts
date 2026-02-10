import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { UUIDField } from '@/common/decorator/fields';

/**
 * Query DTO for filtering and paginating inventory balances
 */
export class QueryBalanceDto extends PaginationQueryDto {
  @UUIDField('Product ID', { required: false })
  productId?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;
}
