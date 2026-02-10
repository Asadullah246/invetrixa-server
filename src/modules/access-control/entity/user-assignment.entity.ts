import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccessScope {
  TENANT = 'TENANT',
  LOCATION = 'LOCATION',
}

// Nested entity for user summary in assignments
export class UserSummaryEntity {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'user_123',
  })
  id: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  lastName: string;
}

// Nested entity for location summary in assignments
export class LocationSummaryEntity {
  @ApiProperty({
    description: 'Unique identifier for the location',
    example: 'loc_123',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the location',
    example: 'Main Store',
  })
  name: string;
}

// Assignment summary for role response (includes nested user and location)
export class UserAssignmentResponseEntity {
  @ApiProperty({
    description: 'Unique identifier for the user assignment',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description:
      'Access scope - TENANT for tenant-wide access, LOCATION for location-specific access',
    enum: AccessScope,
    enumName: 'AccessScope',
    example: AccessScope.TENANT,
  })
  accessScope: AccessScope;

  @ApiProperty({
    description: 'User information',
    type: UserSummaryEntity,
  })
  user: UserSummaryEntity;

  @ApiPropertyOptional({
    description:
      'Location information (only present when accessScope is LOCATION)',
    type: LocationSummaryEntity,
    nullable: true,
  })
  location: LocationSummaryEntity | null;
}

// Full entity for user assignment operations (used in create response)
export class UserAssignmentEntity {
  @ApiProperty({
    description: 'Unique identifier for the user assignment',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description: 'User ID assigned to the role',
    example: 'user_123',
  })
  userId: string;

  @ApiProperty({
    description: 'Role ID for this assignment',
    example: 'role_456',
  })
  roleId: string;

  @ApiProperty({
    description: 'Tenant ID for this assignment',
    example: 'tenant_789',
  })
  tenantId: string;

  @ApiProperty({
    description:
      'Access scope - TENANT for tenant-wide access, LOCATION for location-specific access',
    enum: AccessScope,
    enumName: 'AccessScope',
    example: AccessScope.TENANT,
  })
  accessScope: AccessScope;

  @ApiPropertyOptional({
    description:
      'Location ID for this assignment (required when accessScope is LOCATION)',
    example: 'loc_1',
    nullable: true,
  })
  locationId: string | null;

  @ApiProperty({
    description: 'Timestamp when the assignment was created',
    example: '2025-11-19T07:32:00.000Z',
  })
  assignedAt: Date;

  @ApiProperty({
    description: 'User information',
    type: UserSummaryEntity,
  })
  user: UserSummaryEntity;

  @ApiPropertyOptional({
    description: 'Location information',
    type: LocationSummaryEntity,
    nullable: true,
  })
  location: LocationSummaryEntity | null;
}

export class SuccessResponseEntity {
  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  success: boolean;
}
