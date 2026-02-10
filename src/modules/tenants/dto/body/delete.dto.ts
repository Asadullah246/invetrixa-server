import { ApiProperty } from '@nestjs/swagger';

export class TenantDeleteResponseDto {
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
    example: 'Tenant deleted successfully',
    description: 'A brief message about the response.',
  })
  message: string;

  @ApiProperty({
    example: 'tenant-id-123',
    description: 'The ID of the deleted tenant.',
  })
  tenantId: string;
}
