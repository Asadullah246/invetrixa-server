import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from 'generated/prisma/client';
import {
  BusinessType,
  OnboardingStatus,
  TwoFactorType,
} from 'generated/prisma/enums';

export class UserEntity {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2025-11-19T07:32:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2025-11-19T07:32:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    maxLength: 50,
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  lastName: string;

  @ApiProperty({
    description: 'URL for the user profile photo',
    example: 'https://example.com/avatar.png',
    maxLength: 255,
  })
  profilePhoto: string;

  @ApiProperty({
    description: 'Business types associated with the user',
    enum: BusinessType,
    isArray: true,
    example: ['RETAIL'],
  })
  businessType: BusinessType[];

  @ApiProperty({
    description: 'Email address of the user',
    example: 'johndoe@example.com',
    maxLength: 255,
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number of the user',
    example: '+8801788734362',
    maxLength: 20,
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the email was verified',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  emailVerified: Date | null;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
    default: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Current onboarding status of the user',
    enum: OnboardingStatus,
    example: OnboardingStatus.PENDING,
    default: OnboardingStatus.PENDING,
  })
  onboardingStatus: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Timestamp when onboarding was completed',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  onboardingCompletedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp of the last login',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @ApiPropertyOptional({
    description: 'IP address of the last login',
    example: '192.168.1.1',
    maxLength: 45,
    nullable: true,
  })
  lastLoginIp: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the user was last active',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  lastActiveAt: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the password was last changed',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  passwordChangedAt: Date | null;

  @ApiProperty({
    description: 'Number of failed login attempts',
    example: 0,
    default: 0,
  })
  failedLoginAttempts: number;

  @ApiPropertyOptional({
    description: 'Timestamp until which the account is locked',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  lockedUntil: Date | null;

  @ApiProperty({
    description: 'Current session version for invalidating sessions',
    example: 0,
    default: 0,
  })
  sessionVersion: number;

  @ApiPropertyOptional({
    description: 'Remember me token for persistent sessions',
    maxLength: 255,
    nullable: true,
  })
  rememberMeToken: string | null;

  @ApiProperty({
    description: 'Whether two-factor authentication is enabled',
    example: false,
    default: false,
  })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Type of two-factor authentication',
    enum: TwoFactorType,
    example: TwoFactorType.TOTP,
    nullable: true,
  })
  twoFactorType: TwoFactorType | null;

  @ApiPropertyOptional({
    description: 'Secret for two-factor authentication',
    maxLength: 255,
    nullable: true,
  })
  twoFactorSecret: string | null;

  @ApiPropertyOptional({
    description: 'Temporary secret for two-factor authentication setup',
    maxLength: 255,
    nullable: true,
  })
  twoFactorTempSecret: string | null;

  @ApiProperty({
    description: 'Whether two-factor authentication is enforced',
    example: false,
    default: false,
  })
  twoFactorEnforced: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when two-factor was enforced',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  twoFactorEnforcedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when two-factor was verified',
    example: '2025-11-19T07:32:00.000Z',
    nullable: true,
  })
  twoFactorVerifiedAt: Date | null;

  @ApiProperty({
    description: 'Version of two-factor backup codes',
    example: 0,
    default: 0,
  })
  twoFactorBackupCodesVersion: number;

  @ApiPropertyOptional({
    description: 'User preferences',
    example: null,
    nullable: true,
  })
  preferences: Prisma.UserPreferencesGetPayload<Record<string, never>> | null;

  @ApiProperty({
    description: 'List of trusted devices',
    type: 'array',
    items: { type: 'object' },
    example: [],
  })
  trustedDevices: null;

  @ApiProperty({
    description: 'List of two-factor backup codes',
    type: 'array',
    items: { type: 'object' },
    example: [],
  })
  twoFactorBackupCodes: null;
}
