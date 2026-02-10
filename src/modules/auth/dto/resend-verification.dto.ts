import { EmailField } from '@/common/decorator/fields/email-field.decorator';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @EmailField('Email', {
    required: true,
    example: 'jane.doe@example.com',
  })
  readonly email: string;
}

export class ResendVerificationResponseDto {
  @StringField('Message', {
    required: true,
    example: 'Verification email resent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Data payload, null for this response.',
    example: null,
    nullable: true,
    type: 'string',
  })
  data?: string | null;
}
