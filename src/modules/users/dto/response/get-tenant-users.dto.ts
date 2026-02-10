import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessScope } from 'generated/prisma/enums';

/**
 * Role information within a user assignment
 */
class RoleDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'role-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Manager',
  })
  name: string;
}

/**
 * Location information within a user assignment
 */
class LocationDto {
  @ApiProperty({
    description: 'Location ID',
    example: 'location-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Main Office',
  })
  name: string;
}

/**
 * User assignment (role + optional location) within a tenant
 */
class UserAssignmentDto {
  @ApiProperty({
    description: 'Assignment ID',
    example: 'assignment-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Access scope for this assignment',
    enum: AccessScope,
    example: AccessScope.TENANT,
  })
  accessScope: AccessScope;

  @ApiProperty({
    description: 'Assigned role',
    type: RoleDto,
  })
  role: RoleDto;

  @ApiPropertyOptional({
    description: 'Location if access scope is LOCATION',
    type: LocationDto,
    nullable: true,
  })
  location: LocationDto | null;
}

/**
 * User data returned in tenant user list
 */
export class TenantUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiPropertyOptional({
    description: 'Profile photo URL',
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  profilePhoto: string | null;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Email verification timestamp',
    example: '2024-01-15T10:00:00.000Z',
    nullable: true,
  })
  emailVerified: Date | null;

  @ApiPropertyOptional({
    description: 'Last active timestamp',
    example: '2024-12-21T12:00:00.000Z',
    nullable: true,
  })
  lastActiveAt: Date | null;

  @ApiProperty({
    description: 'Role assignments within this tenant',
    type: [UserAssignmentDto],
  })
  userAssignments: UserAssignmentDto[];
}

/**
 * Response DTO for GET /users (tenant user list)
 */
export class GetTenantUsersResponseDto {
  @ApiProperty({
    description: 'List of users in the tenant',
    type: [TenantUserDto],
  })
  data: TenantUserDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      take: 10,
      total: 25,
      skip: 0,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    page: number;
    limit: number;
    take: number;
    total: number;
    skip: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
