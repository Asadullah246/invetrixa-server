import { ApiProperty } from '@nestjs/swagger';
import { IsIn, ValidateIf } from 'class-validator';
import { StringField } from '@/common/decorator/fields/string-field.decorator';
import { BooleanField } from '@/common/decorator/fields/boolean-field.decorator';

const DisableChannels = ['TOTP', 'EMAIL', 'BACKUP_CODE'] as const;
export type DisableTwoFactorChannel = (typeof DisableChannels)[number];

export class DisableTwoFactorDto {
  @ApiProperty({
    description: 'Method used to confirm the disable action.',
    enum: DisableChannels,
    example: 'TOTP',
  })
  @IsIn(DisableChannels)
  readonly channel: DisableTwoFactorChannel;

  @StringField('Verification Code', {
    required: false,
    max: 20,
    example: '123456',
  })
  readonly code?: string;

  @ApiProperty({
    description: 'Backup recovery code for disabling two-factor.',
    example: 'ABCD-EFGH-IJKL',
    required: false,
  })
  @ValidateIf((dto: DisableTwoFactorDto) => !dto.code)
  readonly backupCode?: string;

  @StringField('Reason', {
    required: false,
    max: 255,
    example: 'Lost authenticator device',
  })
  readonly reason?: string;

  @BooleanField('Admin Override', {
    required: false,
    example: false,
  })
  readonly adminOverride?: boolean;
}
