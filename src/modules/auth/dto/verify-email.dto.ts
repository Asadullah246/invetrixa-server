import { StringField } from '@/common/decorator/fields/string-field.decorator';

export class VerifyEmailDto {
  @StringField('Verification Token', {
    required: true,
    min: 1,
    max: 128,
    example: '3c2f4e21bdfb45a3ab2a12f3e4d56789',
  })
  readonly token: string;
}
