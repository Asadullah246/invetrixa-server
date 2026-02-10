import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { ProductStatus } from 'generated/prisma/client';
import { EnumField, UUIDField, BooleanField } from '@/common/decorator/fields';

/**
 * Query DTO for filtering and paginating categories
 */
export class QueryCategoryDto extends PaginationQueryDto {
  @EnumField('Status', ProductStatus, { required: false })
  status?: ProductStatus;

  @UUIDField('Parent Category ID', { required: false })
  parentId?: string;

  @BooleanField('Root Only', { required: false, example: true })
  rootOnly?: boolean;
}
