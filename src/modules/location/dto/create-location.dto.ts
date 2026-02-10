import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LocationType,
  LocationSubType,
  LocationStatus,
} from 'generated/prisma/client';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';
import { NumberField } from '@/common/decorator/fields/number-field.decorator';
import {
  IsOptional,
  ValidateNested,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for nested address input when creating/updating a location
 */
export class AddressInput {
  @StringField('Address Line 1', {
    required: true,
    max: 255,
    example: '123 Main Street',
  })
  addressLine1: string;

  @StringField('Address Line 2', {
    required: false,
    max: 255,
    example: 'Suite 100',
  })
  addressLine2?: string;

  @StringField('City', {
    required: true,
    max: 100,
    example: 'Dhaka',
  })
  city: string;

  @StringField('State/Province', {
    required: true,
    max: 100,
    example: 'Dhaka Division',
  })
  state: string;

  @StringField('Postal Code', {
    required: true,
    max: 20,
    example: '1205',
  })
  postalCode: string;

  @StringField('Country', {
    required: true,
    max: 100,
    example: 'Bangladesh',
  })
  country: string;

  @NumberField('Latitude', { required: false, example: 23.8103 })
  latitude?: number;

  @NumberField('Longitude', { required: false, example: 90.4125 })
  longitude?: number;

  @StringField('Google Maps URL', {
    required: false,
    max: 500,
    example: 'https://maps.google.com/?q=23.8103,90.4125',
  })
  googleMapUrl?: string;
}

/**
 * DTO for creating a new location
 */
export class CreateLocationDto {
  @StringField('Location Name', {
    required: true,
    max: 255,
    example: 'Dhaka Warehouse',
  })
  name: string;

  @StringField('Location Code', {
    required: false,
    max: 50,
    example: 'WH-01',
  })
  code?: string;

  @EnumField('Location Type', LocationType, { required: false })
  type?: LocationType;

  @EnumField('Location Sub-Type', LocationSubType, { required: false })
  subType?: LocationSubType;

  @StringField('Email', {
    required: true,
    max: 255,
    example: 'warehouse@example.com',
  })
  email: string;

  @StringField('Phone', {
    required: true,
    max: 20,
    example: '+8801712345678',
  })
  phone: string;

  @StringField('Business Hours', {
    required: false,
    max: 255,
    example: '9:00 AM - 5:00 PM',
  })
  businessHours?: string;

  @NumberField('Total Capacity', { required: false, min: 0, example: 1000 })
  totalCapacity?: number;

  @EnumField('Status', LocationStatus, { required: false })
  status?: LocationStatus;

  @ApiPropertyOptional({
    description: 'Year the location was established',
    example: '2020-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  establishedYear?: string;

  @ApiPropertyOptional({
    description: 'Address details for the location',
    type: AddressInput,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInput)
  address?: AddressInput;
}
