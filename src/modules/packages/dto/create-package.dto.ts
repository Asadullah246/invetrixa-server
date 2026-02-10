import { ApiProperty } from '@nestjs/swagger';
import { PackageType, Period } from 'generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { StringField, NumberField, EnumField } from '@/common/decorator/fields';

export class PackageFeatureDto {
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

export class CreatePackageDto {
  @StringField('Name', {
    required: true,
    max: 200,
    example: 'Free',
  })
  name: string;

  @StringField('Description', {
    required: false,
    max: 1000,
    example: 'This is a free package with limited features.',
  })
  description?: string;

  @EnumField('Package Type', PackageType, { required: true })
  type: PackageType;

  @NumberField('Price', {
    required: true,
    min: 0,
    example: 0,
  })
  price: number;

  @EnumField('Period', Period, { required: true })
  period: Period;

  @ApiProperty({
    type: [PackageFeatureDto],
    description: 'List of features included in the package',
    example: [{ actionKey: 'feature_access', limit: 100, price: null }],
  })
  @IsArray({ message: 'Features must be an array' })
  @ArrayMinSize(1, { message: 'At least one feature is required' })
  @ValidateNested({ each: true })
  @Type(() => PackageFeatureDto)
  features: PackageFeatureDto[];
}
