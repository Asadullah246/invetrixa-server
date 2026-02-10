import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnboardingStatus, Theme, TwoFactorType } from 'generated/prisma/enums';

// ─────────────────────────────────────────────────────────────
// Nested DTOs
// ─────────────────────────────────────────────────────────────

class TrustedDeviceDto {
  @ApiProperty({ example: 'device-uuid-123' })
  id: string;

  @ApiPropertyOptional({ example: 'My Laptop', nullable: true })
  label: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...', nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional({ example: '192.168.1.1', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ example: '2024-12-21T12:00:00.000Z', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ example: '2025-01-21T12:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: '2024-12-01T10:00:00.000Z' })
  createdAt: Date;
}

/**
 * Flattened role assignment for user details
 */

/**
 * Flattened role assignment for user details
 */
class RoleAssignmentDto {
  @ApiProperty({ example: 'Editor', description: 'Role name' })
  role: string;

  @ApiPropertyOptional({
    example: 'Main Office',
    description: 'Location name if location-scoped',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({ example: '2024-06-15T10:00:00.000Z' })
  assignedAt: Date;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Name of user who assigned this role',
    nullable: true,
  })
  assignerName: string | null;
}

class PreferencesDto {
  @ApiProperty({ example: 'UTC' })
  timezone: string;

  @ApiProperty({ example: 'en' })
  language: string;

  @ApiProperty({ enum: Theme, example: Theme.LIGHT })
  theme: Theme;

  @ApiProperty({ example: true })
  emailNotifications: boolean;

  @ApiProperty({ example: false })
  smsNotifications: boolean;

  @ApiProperty({ example: true })
  pushNotifications: boolean;
}

class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Suite 100', nullable: true })
  addressLine2: string | null;

  @ApiProperty({ example: 'New York' })
  city: string;

  @ApiProperty({ example: 'NY' })
  state: string;

  @ApiProperty({ example: '10001' })
  postalCode: string;

  @ApiProperty({ example: 'USA' })
  country: string;
}

// ─────────────────────────────────────────────────────────────
// Main Response DTO
// ─────────────────────────────────────────────────────────────

/**
 * Response DTO for GET /users/:id with comprehensive user details
 */
export class GetUserDetailsResponseDto {
  // Basic Info
  @ApiProperty({ example: 'user-uuid-123' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890', nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  profilePhoto: string | null;

  // Status
  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00.000Z', nullable: true })
  emailVerified: Date | null;

  @ApiProperty({ enum: OnboardingStatus, example: OnboardingStatus.COMPLETED })
  onboardingStatus: OnboardingStatus;

  @ApiPropertyOptional({ example: '2024-01-20T10:00:00.000Z', nullable: true })
  onboardingCompletedAt: Date | null;

  // Activity Tracking
  @ApiPropertyOptional({ example: '2024-12-21T12:00:00.000Z', nullable: true })
  lastLoginAt: Date | null;

  @ApiPropertyOptional({ example: '192.168.1.1', nullable: true })
  lastLoginIp: string | null;

  @ApiPropertyOptional({ example: '2024-12-21T14:30:00.000Z', nullable: true })
  lastActiveAt: Date | null;

  @ApiPropertyOptional({ example: '2024-06-01T10:00:00.000Z', nullable: true })
  passwordChangedAt: Date | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt: Date;

  // Security Info
  @ApiProperty({ example: true })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({
    enum: TwoFactorType,
    example: TwoFactorType.TOTP,
    nullable: true,
  })
  twoFactorType: TwoFactorType | null;

  @ApiProperty({ example: false })
  twoFactorEnforced: boolean;

  @ApiProperty({ example: 0 })
  failedLoginAttempts: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  lockedUntil: Date | null;

  // Related Data
  @ApiProperty({ type: [TrustedDeviceDto] })
  trustedDevices: TrustedDeviceDto[];

  @ApiProperty({ example: 2 })
  trustedDevicesCount: number;

  @ApiProperty({
    type: [RoleAssignmentDto],
    description: 'Role assignments in this tenant',
  })
  roleAssignments: RoleAssignmentDto[];

  @ApiPropertyOptional({ type: PreferencesDto, nullable: true })
  preferences: PreferencesDto | null;

  @ApiPropertyOptional({ type: AddressDto, nullable: true })
  address: AddressDto | null;
}
