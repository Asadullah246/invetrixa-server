import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus, TwoFactorType } from 'generated/prisma/enums';
import {
  StringField,
  EmailField,
  PasswordField,
  PhoneField,
} from '@/common/decorator/fields';

export class RegisterDto {
  @StringField('First Name', {
    required: true,
    max: 50,
    example: 'Jane',
  })
  readonly firstName: string;

  @StringField('Last Name', {
    required: true,
    max: 50,
    example: 'Doe',
  })
  readonly lastName: string;

  @EmailField('Email', { required: true })
  readonly email: string;

  @PasswordField('Password', {
    required: true,
    min: 8,
    example: 'Str0ngP@ssw0rd!',
  })
  readonly password: string;

  @PhoneField('Phone Number', {
    required: false,
    max: 20,
    example: '+14155552671',
  })
  readonly phoneNumber?: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the newly created user.',
    example: 'f5ba6c80-43e5-4a07-8af7-2d5e54f39e9d',
  })
  readonly id: string;

  @ApiProperty({
    description: 'Email address associated with the newly created user.',
    example: 'jane.doe@example.com',
  })
  readonly email: string;

  @ApiProperty({
    description: 'Given name of the newly created user.',
    example: 'Jane',
  })
  readonly firstName: string;

  @ApiProperty({
    description: 'Family name of the newly created user.',
    example: 'Doe',
  })
  readonly lastName: string;

  @ApiProperty({
    description: 'Optional phone number associated with the user profile.',
    example: '+14155552671',
    required: false,
    nullable: true,
  })
  readonly phoneNumber?: string | null;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the account was created.',
    example: '2025-01-15T08:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  readonly createdAt: Date;

  @ApiProperty({
    description:
      'ISO 8601 timestamp of when the email was verified, or null if not verified.',
    example: '2025-01-15T09:00:00.000Z',
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
  })
  readonly emailVerified: Date | null;

  @ApiProperty({
    description: 'ISO 8601 timestamp of the last successful login, if any.',
    example: '2025-02-20T10:45:12.000Z',
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
  })
  readonly lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Current onboarding status for the user.',
    enum: OnboardingStatus,
    example: OnboardingStatus.PENDING,
  })
  readonly onboardingStatus: OnboardingStatus;

  @ApiProperty({
    description:
      'Indicates whether the user still needs to complete onboarding.',
    example: true,
  })
  readonly needsOnboarding: boolean;

  @ApiProperty({
    description:
      'ISO 8601 timestamp of when onboarding was completed, if applicable.',
    example: '2025-02-20T12:00:00.000Z',
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
  })
  readonly onboardingCompletedAt: Date | null;

  @ApiProperty({
    description: 'Indicates whether two-factor authentication is enabled.',
    example: false,
  })
  readonly twoFactorEnabled: boolean;

  @ApiProperty({
    description: 'Active two-factor method, if any.',
    enum: TwoFactorType,
    required: false,
    nullable: true,
    example: TwoFactorType.TOTP,
  })
  readonly twoFactorType?: TwoFactorType | null;

  @ApiProperty({
    description:
      'Indicates whether the current session still needs to pass two-factor.',
    example: false,
  })
  readonly requiresTwoFactor: boolean;

  @ApiProperty({
    description:
      'Indicates whether the current session has satisfied two-factor authentication.',
    example: true,
  })
  readonly twoFactorVerified: boolean;

  @ApiProperty({
    description:
      'Indicates whether the user profile onboarding step is complete.',
    example: false,
  })
  readonly profileComplete: boolean;

  @ApiProperty({
    description:
      'Indicates whether the tenant creation onboarding step is complete.',
    example: false,
  })
  readonly tenantCreation: boolean;

  @ApiProperty({
    description:
      'Indicates whether the tenant settings onboarding step is complete.',
    example: false,
  })
  readonly tenantSetting: boolean;
}
