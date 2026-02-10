import { StringField, NumberField } from '@/common/decorator/fields';

export class AddModuleLimitsDto {
  @StringField('Action Key', {
    required: true,
    max: 100,
    example: 'feature_access',
  })
  actionKey: string;

  @NumberField('Limit', {
    required: false,
    min: 0,
    example: 100,
  })
  limit?: number | null;

  @NumberField('Price', {
    required: false,
    min: 0,
    example: 9.99,
  })
  price?: number | null;
}
