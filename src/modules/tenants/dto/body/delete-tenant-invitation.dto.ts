import { ApiProperty } from '@nestjs/swagger';

export class DeleteTenantInvitationResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful.',
  })
  success: boolean;

  @ApiProperty({
    example: 204,
    description: 'The HTTP status code.',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Invitation deleted successfully',
    description: 'A brief message about the response.',
  })
  message: string;

  @ApiProperty({
    example: 'inv-123',
    description: 'The ID of the deleted invitation.',
  })
  invitationId: string;
}
