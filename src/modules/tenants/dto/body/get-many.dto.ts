import { ApiProperty } from '@nestjs/swagger';

export class TenantListItemDto {
  @ApiProperty({
    example: 'tenant-id-123',
    description: 'The unique identifier of the tenant.',
  })
  id: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'The name of the tenant.',
  })
  name: string;
}

export class GetTenantsResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful.',
  })
  success: boolean;

  @ApiProperty({
    example: 200,
    description: 'The HTTP status code.',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Tenants retrieved successfully',
    description: 'A brief message about the response.',
  })
  message: string;

  @ApiProperty({
    type: [TenantListItemDto],
    description: 'List of tenants for the user.',
  })
  data: TenantListItemDto[];

  @ApiProperty({
    example: 5,
    description: 'Total number of tenants.',
  })
  total: number;
}
