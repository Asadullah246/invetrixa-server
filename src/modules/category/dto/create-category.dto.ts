import { ProductStatus } from 'generated/prisma/client';
import {
  StringField,
  EnumField,
  UUIDField,
  UrlField,
} from '@/common/decorator/fields';

export class CreateCategoryDto {
  @StringField('Category Name', {
    required: true,
    max: 255,
    example: 'Electronics',
  })
  name: string;

  @StringField('URL Slug', {
    required: false,
    max: 255,
    example: 'electronics',
  })
  slug?: string;

  @StringField('Description', {
    required: false,
    example: 'All electronic devices and gadgets',
  })
  description?: string;

  @UrlField('Image URL', {
    required: false,
    example: 'https://example.com/images/electronics.jpg',
  })
  image?: string;

  @EnumField('Status', ProductStatus, { required: false })
  status?: ProductStatus;

  @UUIDField('Parent Category ID', {
    required: false,
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  parentId?: string;
}
