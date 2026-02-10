import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { TenantInvitationStatus } from 'generated/prisma/enums';
import { EmailField, StringField } from '@/common/decorator/fields';
import { TENANT_INVITATION_CONSTRAINTS } from '@/common/constants/prisma-field-constraints';

export class CreateTenantInvitationDto {
  @EmailField('Email', {
    required: true,
  })
  email: string;

  @StringField('Message', {
    min: 1,
    max: TENANT_INVITATION_CONSTRAINTS.message.max,
    example: 'You are invited to join our workspace',
    required: false,
  })
  message?: string;

  @StringField('Role ID', {
    min: 1,
    max: 36,
    example: 'role_abc123',
    required: false,
  })
  roleId?: string;

  @ApiPropertyOptional({
    type: Date,
    example: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    description:
      'Invitation expiry time. Optional, defaults to 7 days from now.',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

export class TenantInvitationResponseDto {
  @ApiProperty({
    example: 'inv-123',
    description: 'The unique invitation ID.',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the invited user.',
  })
  email: string;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    description: 'Current status of the invitation.',
  })
  status: TenantInvitationStatus;

  @ApiPropertyOptional({
    example: 'You are invited to join our workspace',
    description: 'Optional message included in the invitation.',
  })
  message?: string | null;

  @ApiProperty({
    example: new Date(),
    description: 'When the invitation expires.',
  })
  expiresAt: Date | null;
}

export class AcceptInvitationDto {
  @StringField('Token', {
    min: 1,
    max: 128,
    example: 'a1b2c3d4e5f6...',
  })
  token: string;
}

export class DeclineInvitationDto {
  @StringField('Token', {
    min: 1,
    max: 128,
    example: 'a1b2c3d4e5f6...',
  })
  token: string;
}
