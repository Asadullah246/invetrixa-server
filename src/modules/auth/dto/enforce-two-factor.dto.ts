import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class EnforceTwoFactorDto {
  @ApiProperty({
    description:
      'Indicates whether two-factor authentication should be enforced for this account.',
    example: true,
  })
  @IsBoolean()
  readonly enforced: boolean;
}

export class AdminEnforceTwoFactorDto extends EnforceTwoFactorDto {
  @ApiProperty({
    description:
      'Unique identifier of the user whose enforcement status should be updated.',
    example: 'f5ba6c80-43e5-4a07-8af7-2d5e54f39e9d',
  })
  @IsUUID()
  readonly userId: string;
}
