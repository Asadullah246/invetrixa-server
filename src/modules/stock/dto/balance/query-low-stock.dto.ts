import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { UUIDField } from '@/common/decorator/fields';

/**
 * Query DTO for filtering and paginating low stock items
 * Inherits search from PaginationQueryDto
 */
export class QueryLowStockDto extends PaginationQueryDto {
  @UUIDField('Location ID', { required: false })
  locationId?: string;
}
