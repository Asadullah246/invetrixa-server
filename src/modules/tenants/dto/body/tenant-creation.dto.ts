import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyType, Industry, PricingMethod } from 'generated/prisma/enums';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  StringField,
  EnumField,
  UrlField,
  PhoneField,
  EmailField,
  NumberField,
} from '@/common/decorator/fields';
import {
  TENANT_CONSTRAINTS,
  ADDRESS_CONSTRAINTS,
  TENANT_SETTINGS_CONSTRAINTS,
} from '@/common/constants/prisma-field-constraints';

export class TenantSettingsDto {
  @EnumField('Default Pricing Method', PricingMethod, {
    required: false,
  })
  defaultPricingMethod?: PricingMethod;

  @StringField('Timezone', {
    min: 1,
    max: TENANT_SETTINGS_CONSTRAINTS.timezone.max,
    example: 'Asia/Dhaka',
    required: false,
  })
  timezone?: string;

  @StringField('Locale', {
    min: 1,
    max: TENANT_SETTINGS_CONSTRAINTS.locale.max,
    example: 'en-US',
    required: false,
  })
  locale?: string;

  @StringField('Currency', {
    min: 1,
    max: TENANT_SETTINGS_CONSTRAINTS.currency.max,
    example: 'USD',
    required: false,
  })
  currency?: string;

  @StringField('Date Format', {
    min: 8,
    max: TENANT_SETTINGS_CONSTRAINTS.dateFormat.max,
    example: 'MM/DD/YYYY',
    required: false,
  })
  dateFormat?: string;

  @StringField('Time Format', {
    min: 7,
    max: TENANT_SETTINGS_CONSTRAINTS.timeFormat.max,
    example: 'hh:mm A',
    required: false,
  })
  timeFormat?: string;

  @StringField('Decimal Separator', {
    min: 1,
    max: TENANT_SETTINGS_CONSTRAINTS.decimalSeparator.max,
    example: '.',
    required: false,
  })
  decimalSeparator?: string;

  @StringField('Thousands Separator', {
    min: 1,
    max: TENANT_SETTINGS_CONSTRAINTS.thousandsSeparator.max,
    example: ',',
    required: false,
  })
  thousandsSeparator?: string;
}

export class TenantAddressDto {
  @StringField('Address Line 1', {
    max: ADDRESS_CONSTRAINTS.addressLine1.max,
  })
  addressLine1: string;

  @StringField('Address Line 2', {
    max: ADDRESS_CONSTRAINTS.addressLine2.max,
    required: false,
  })
  addressLine2?: string;

  @StringField('City', { max: ADDRESS_CONSTRAINTS.city.max })
  city: string;

  @StringField('State', { max: ADDRESS_CONSTRAINTS.state.max })
  state: string;

  @StringField('Postal Code', {
    max: ADDRESS_CONSTRAINTS.postalCode.max,
  })
  postalCode: string;

  @StringField('Country', { max: ADDRESS_CONSTRAINTS.country.max })
  country: string;

  @NumberField('Latitude', { required: false, example: 23.8103 })
  latitude?: number;

  @NumberField('Longitude', { required: false, example: 23.8103 })
  longitude?: number;
}

export class TenantCreationDto {
  // Tenant core info
  @StringField('Company Name', {
    min: 1,
    max: TENANT_CONSTRAINTS.name.max,
    required: true,
  })
  name: string;

  @EnumField('Company Type', CompanyType, { required: true })
  companyType: CompanyType;

  @EnumField('Industry', Industry)
  industry: Industry;

  @StringField('Registration Number', {
    max: TENANT_CONSTRAINTS.registrationNumber.max,
    required: false,
  })
  registrationNumber?: string;

  @EmailField('Business Email', {
    max: TENANT_CONSTRAINTS.businessEmail.max,
  })
  businessEmail: string;

  @PhoneField('Business Phone', {
    min: 6,
    max: TENANT_CONSTRAINTS.businessPhone.max,
    example: '+8801912345678',
  })
  businessPhone: string;

  @UrlField('Website', { required: false, max: TENANT_CONSTRAINTS.website.max })
  website?: string;

  @StringField('Description', {
    max: TENANT_CONSTRAINTS.description.max,
    required: false,
  })
  description?: string;

  @StringField('Established Year', {
    min: TENANT_CONSTRAINTS.establishedYear.max,
    max: TENANT_CONSTRAINTS.establishedYear.max,
    example: '1999',
  })
  establishedYear: string;

  @UrlField('Logo URL', {
    required: false,
    max: TENANT_CONSTRAINTS.logo.max,
  })
  logo?: string | null;

  // Address (extracted DTO)
  @ValidateNested()
  @Type(() => TenantAddressDto)
  @ApiProperty({ type: TenantAddressDto })
  address: TenantAddressDto;

  // Settings (already separate)
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  @ApiPropertyOptional({ type: TenantSettingsDto })
  tenantSettings?: TenantSettingsDto;
}

export class TenantAddressResponseDto extends TenantAddressDto {
  @StringField('Address ID', { min: 36, max: 36 })
  id: string;

  @ApiProperty({ description: 'Created At', example: new Date() })
  createdAt: Date;

  @ApiProperty({ description: 'Updated At', example: new Date() })
  updatedAt: Date;
}
export class TenantSettingResponseDto extends TenantSettingsDto {
  @StringField('Tenant Setting ID', { min: 36, max: 36 })
  id: string;
}

export class TenantResponseDto extends TenantCreationDto {
  @StringField('Tenant ID', { min: 36, max: 36 })
  id: string;

  @ApiProperty({ type: TenantAddressResponseDto })
  @Type(() => TenantAddressResponseDto)
  declare address: TenantAddressResponseDto;

  @ApiPropertyOptional({ type: TenantSettingResponseDto })
  @Type(() => TenantSettingResponseDto)
  declare tenantSettings?: TenantSettingResponseDto;

  @ApiPropertyOptional({ description: 'Created At', example: new Date() })
  declare createdAt?: Date;

  @ApiPropertyOptional({ description: 'Updated At', example: new Date() })
  declare updatedAt?: Date;
}
