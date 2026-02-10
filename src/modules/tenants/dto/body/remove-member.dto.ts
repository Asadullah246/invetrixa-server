import { ApiProperty } from '@nestjs/swagger';
import { StringField, UUIDField } from '@/common/decorator/fields';

export class RemoveTenantMemberDto {
  @UUIDField('User ID', { required: true })
  userId: string;

  @StringField('Reason', {
    required: false,
    max: 500,
    example: 'Violation of company policy',
  })
  reason?: string;
}

export class RemoveTenantMemberResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Member removed from tenant successfully.' })
  message: string;
}
