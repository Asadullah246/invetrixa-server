import { ApiProperty } from '@nestjs/swagger';
import { TenantInvitationResponseDto } from './tenant-invitation.dto';

export class GetTenantInvitationsResponseDto {
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
    example: 'Invitations retrieved successfully',
    description: 'A brief message about the response.',
  })
  message: string;

  @ApiProperty({
    type: [TenantInvitationResponseDto],
    description: 'List of tenant invitations.',
  })
  data: TenantInvitationResponseDto[];

  @ApiProperty({
    example: 5,
    description: 'Total number of invitations.',
  })
  total: number;
}
