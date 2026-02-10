import { EmailField } from '@/common/decorator/fields/email-field.decorator';

export class RequestPasswordResetDto {
  @EmailField('Email', {
    required: true,
    example: 'jane.doe@example.com',
  })
  readonly email: string;
}
