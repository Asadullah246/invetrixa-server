import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { BooleanField } from '@/common/decorator/fields/boolean-field.decorator';

export const SupportedTwoFactorChannels = [
  'TOTP',
  'EMAIL',
  'BACKUP_CODE',
] as const;

export type TwoFactorVerificationChannel =
  (typeof SupportedTwoFactorChannels)[number];

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: 'Channel used to verify the second factor.',
    enum: SupportedTwoFactorChannels,
    example: 'TOTP',
  })
  @IsIn(SupportedTwoFactorChannels)
  readonly channel: TwoFactorVerificationChannel;

  @StringField('Verification Code', {
    required: true,
    max: 50,
    example: '123456',
  })
  readonly code: string;

  @BooleanField('Remember Device', {
    required: false,
    example: true,
  })
  readonly rememberDevice?: boolean;

  @StringField('Device Label', {
    required: false,
    max: 100,
    example: "Jane's iPhone 15",
  })
  readonly deviceLabel?: string;
}
