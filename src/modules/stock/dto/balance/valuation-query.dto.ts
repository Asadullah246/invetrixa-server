import { PricingMethod } from 'generated/prisma/client';
import { EnumField } from '@/common/decorator/fields';

export class ValuationQueryDto {
  @EnumField('Costing Method', PricingMethod, { required: false })
  method?: PricingMethod;
}
