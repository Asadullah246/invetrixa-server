import { TwoFactorType } from 'generated/prisma/enums';
import { EnumField } from '@/common/decorator/fields/enum-field.decorator';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { BooleanField } from '@/common/decorator/fields/boolean-field.decorator';

export class EnableTwoFactorDto {
  @EnumField('Two-Factor Method', TwoFactorType, { required: true })
  readonly method: TwoFactorType;

  @StringField('Verification Code', {
    required: true,
    max: 20,
    example: '123456',
  })
  readonly code: string;

  @StringField('Device Label', {
    required: false,
    max: 100,
    example: "Jane's MacBook Pro",
  })
  readonly deviceLabel?: string;

  @BooleanField('Remember Device', {
    required: false,
    example: true,
  })
  readonly rememberDevice?: boolean;
}
