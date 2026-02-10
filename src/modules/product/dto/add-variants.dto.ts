import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VariantInput } from './create-product.dto';

/**
 * DTO for adding new explicit variants to an existing product
 */
export class AddVariantsDto {
  @ApiPropertyOptional({
    description: 'Explicit variants to add to the product',
    type: [VariantInput],
    example: [
      {
        sku: 'PROD-GRN-XL',
        attributes: [
          { attributeId: 'color-uuid', value: 'Green' },
          { attributeId: 'size-uuid', value: 'XL' },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants: VariantInput[];
}
