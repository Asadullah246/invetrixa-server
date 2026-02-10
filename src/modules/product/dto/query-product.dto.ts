import { ProductStatus } from 'generated/prisma/client';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import {
  EnumField,
  BooleanField,
  UUIDField,
  StringField,
} from '@/common/decorator/fields';

/**
 * Query parameters for filtering products
 */
export class QueryProductDto extends PaginationQueryDto {
  @EnumField('Filter by Status', ProductStatus, { required: false })
  status?: ProductStatus;

  @StringField('Filter by Unit Type', { required: false, max: 50 })
  unitType?: string;

  @UUIDField('Filter by Category ID', { required: false })
  categoryId?: string;

  @BooleanField('Filter by Featured', { required: false, example: true })
  isFeatured?: boolean;

  @UUIDField('Filter by Parent Product ID (for variants)', { required: false })
  parentId?: string;

  // Attribute filters
  @StringField('Filter by Attribute Key', {
    required: false,
    max: 100,
    example: 'Color',
  })
  attributeKey?: string;

  @StringField('Filter by Attribute Value (used with attributeKey)', {
    required: false,
    example: 'Red',
  })
  attributeValue?: string;

  @BooleanField('Show Parent Products Only (VARIABLE type)', {
    required: false,
    example: false,
  })
  parentOnly?: boolean;
}
