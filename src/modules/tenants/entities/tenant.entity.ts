import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyType, Industry, TenantStatus } from 'generated/prisma/enums';

export class Tenant {
  @ApiProperty({
    description: 'Unique identifier for the tenant',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the tenant/company',
    example: 'Acme Corporation',
    maxLength: 200,
  })
  name: string;

  @ApiProperty({
    description: 'Type of company',
    enum: CompanyType,
    example: CompanyType.PRIVATE_LIMITED,
  })
  companyType: CompanyType;

  @ApiProperty({
    description: 'Industry sector',
    enum: Industry,
    example: Industry.RETAIL,
  })
  industry: Industry;

  @ApiProperty({
    description: 'Company registration number',
    example: 'REG-123456789',
    maxLength: 100,
  })
  registrationNumber: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'contact@acmecorp.com',
    maxLength: 255,
  })
  businessEmail: string;

  @ApiProperty({
    description: 'Business phone number',
    example: '+8801788734362',
    maxLength: 50,
  })
  businessPhone: string;

  @ApiProperty({
    description: 'Company website URL',
    example: 'https://www.acmecorp.com',
    maxLength: 255,
  })
  website: string;

  @ApiPropertyOptional({
    description: 'Description of the company',
    example: 'Leading provider of innovative solutions',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Year the company was established',
    example: '2020',
    maxLength: 4,
  })
  establishedYear: string;

  @ApiPropertyOptional({
    description: 'URL for the company logo',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logo: string | null;

  @ApiProperty({
    description: 'Current status of the tenant',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
    default: TenantStatus.PENDING,
  })
  status: TenantStatus;

  @ApiProperty({
    description: 'Timestamp when the tenant was created',
    example: '2025-11-19T07:32:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the tenant was last updated',
    example: '2025-11-19T07:32:00.000Z',
  })
  updatedAt: Date;
}
