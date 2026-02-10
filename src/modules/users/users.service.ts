import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MfaChallengeChannel,
  Prisma,
  TrustedDevice,
  TrustedDeviceStatus,
  TwoFactorBackupCode,
  TwoFactorChallenge,
  User,
} from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TenantUserFilterDto, UpdateMeDto } from './dto';
import { ArgonHelper } from '@/common/utils/argon/argon.helper';
import { generatePaginationMeta, getPagination } from '@/common/utils';
import { EmailService } from '@/common/services/email-service/email.service';

export type UserWithPreferences = Prisma.UserGetPayload<{
  include: {
    preferences: true;
    trustedDevices: true;
    twoFactorBackupCodes: true;
    onboardingState: true;
  };
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private argonHelper: ArgonHelper,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Logger
   */

  private readonly logger = new Logger(UsersService.name);

  /**
   * Create a new user in the database
   * @param data - User creation data conforming to Prisma UserCreateInput
   * @returns Promise resolving to the created user with preferences, trusted devices, and backup codes
   */
  create(data: Prisma.UserCreateInput): Promise<UserWithPreferences> {
    return this.prisma.user.create({
      data,
      include: {
        preferences: true,
        trustedDevices: true,
        twoFactorBackupCodes: true,
        onboardingState: true,
      },
    });
  }

  /**
   * Find a user by their email address
   * @param email - The email address to search for
   * @returns Promise resolving to the user with preferences and security data, or null if not found
   */
  findByEmail(email: string): Promise<UserWithPreferences | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        preferences: true,
        trustedDevices: true,
        twoFactorBackupCodes: true,
        onboardingState: true,
      },
    });
  }

  /**
   * Find a user by their unique ID
   * @param id - The user's unique identifier
   * @returns Promise resolving to the user with preferences and security data, or null if not found
   */
  findById(id: string): Promise<UserWithPreferences | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        trustedDevices: true,
        twoFactorBackupCodes: true,
        onboardingState: true,
      },
    });
  }

  /**
   * Update a user's information
   * @param id - The user's unique identifier
   * @param data - User update data conforming to Prisma UserUpdateInput
   * @returns Promise resolving to the updated user with preferences, onboarding state, and security data
   */
  update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserWithPreferences> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        preferences: true,
        onboardingState: true,
        trustedDevices: true,
        twoFactorBackupCodes: true,
      },
    });
  }

  /**
   * Create a password history entry for a user
   * Used to track password changes and prevent password reuse
   * @param userId - The user's unique identifier
   * @param password - The hashed password to store in history
   * @returns Promise that resolves when the history entry is created
   */
  async createPasswordHistory(userId: string, password: string): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        password,
      },
    });
  }

  /**
   * Reset failed login attempts and unlock the user account
   * Called after successful authentication or manual unlock
   * @param userId - The user's unique identifier
   * @returns Promise resolving to the updated user
   */
  async resetFailedLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Increment the failed login attempt counter for a user
   * Used to track and potentially lock accounts after multiple failed attempts
   * @param userId - The user's unique identifier
   * @param incrementBy - The number to increment the counter by (typically 1)
   * @returns Promise resolving to the updated user
   */
  async incrementFailedLogin(
    userId: string,
    incrementBy: number,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: incrementBy,
        },
      },
    });
  }

  /**
   * Register a new trusted device for a user
   * Trusted devices can bypass certain MFA requirements
   * @param data - Trusted device creation data
   * @returns Promise resolving to the created trusted device
   */
  async createTrustedDevice(
    data: Prisma.TrustedDeviceCreateInput,
  ): Promise<TrustedDevice> {
    return this.prisma.trustedDevice.create({ data });
  }

  /**
   * Update a trusted device's information
   * @param deviceId - The device's unique identifier
   * @param data - Trusted device update data
   * @returns Promise resolving to the updated trusted device
   */
  async updateTrustedDevice(
    deviceId: string,
    data: Prisma.TrustedDeviceUpdateInput,
  ): Promise<TrustedDevice> {
    return this.prisma.trustedDevice.update({
      where: { deviceId },
      data,
    });
  }

  /**
   * Revoke a trusted device, preventing it from bypassing MFA
   * Sets the device status to REVOKED and expires it immediately
   * @param deviceId - The device's unique identifier
   * @returns Promise resolving to the revoked device, or null if the device doesn't exist
   */
  async revokeTrustedDevice(deviceId: string): Promise<TrustedDevice | null> {
    try {
      return await this.prisma.trustedDevice.update({
        where: { deviceId },
        data: {
          status: TrustedDeviceStatus.REVOKED,
          expiresAt: new Date(),
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * Find a trusted device by its unique identifier
   * @param deviceId - The device's unique identifier
   * @returns Promise resolving to the trusted device, or null if not found
   */
  findTrustedDevice(deviceId: string): Promise<TrustedDevice | null> {
    return this.prisma.trustedDevice.findUnique({
      where: { deviceId },
    });
  }

  /**
   * Permanently delete a trusted device from the database
   * @param deviceId - The device's unique identifier
   * @returns Promise that resolves when the device is deleted
   */
  async deleteTrustedDevice(deviceId: string): Promise<void> {
    await this.prisma.trustedDevice.delete({
      where: { deviceId },
    });
  }

  /**
   * Replace all existing backup codes for a user with new ones
   * Deletes old codes and creates new ones in a transaction to ensure atomicity
   * @param userId - The user's unique identifier
   * @param codes - Array of new backup codes to create
   * @returns Promise resolving to the newly created backup codes, ordered by creation date
   */
  async replaceBackupCodes(
    userId: string,
    codes: Prisma.TwoFactorBackupCodeCreateManyInput[],
  ): Promise<TwoFactorBackupCode[]> {
    await this.prisma.$transaction([
      this.prisma.twoFactorBackupCode.deleteMany({
        where: { userId },
      }),
      this.prisma.twoFactorBackupCode.createMany({
        data: codes,
      }),
    ]);

    return this.prisma.twoFactorBackupCode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark a backup code as used
   * Once marked, the code cannot be reused for authentication
   * @param id - The backup code's unique identifier
   * @returns Promise resolving to the updated backup code
   */
  async markBackupCodeUsed(id: string): Promise<TwoFactorBackupCode> {
    return this.prisma.twoFactorBackupCode.update({
      where: { id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Retrieve all backup codes for a user
   * @param userId - The user's unique identifier
   * @returns Promise resolving to an array of backup codes
   */
  findBackupCodes(userId: string): Promise<TwoFactorBackupCode[]> {
    return this.prisma.twoFactorBackupCode.findMany({
      where: { userId },
    });
  }

  /**
   * Create a new two-factor authentication challenge
   * Used during the MFA verification process
   * @param data - Challenge creation data including code, channel, and expiration
   * @returns Promise resolving to the created challenge
   */
  async createChallenge(
    data: Prisma.TwoFactorChallengeCreateInput,
  ): Promise<TwoFactorChallenge> {
    return this.prisma.twoFactorChallenge.create({ data });
  }

  /**
   * Mark a two-factor challenge as consumed
   * Called after successful verification to prevent reuse
   * @param id - The challenge's unique identifier
   * @returns Promise resolving to the updated challenge
   */
  async consumeChallenge(id: string): Promise<TwoFactorChallenge> {
    return this.prisma.twoFactorChallenge.update({
      where: { id },
      data: {
        consumed: true,
        consumedAt: new Date(),
      },
    });
  }

  /**
   * Increment the attempt counter for a two-factor challenge
   * Used to track and limit verification attempts
   * @param id - The challenge's unique identifier
   * @returns Promise resolving to the updated challenge
   */
  async incrementChallengeAttempt(id: string): Promise<TwoFactorChallenge> {
    return this.prisma.twoFactorChallenge.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Find the most recent active (unconsumed and unexpired) challenge for a user and channel
   * @param userId - The user's unique identifier
   * @param channel - The MFA channel (e.g., EMAIL, SMS, AUTHENTICATOR)
   * @returns Promise resolving to the active challenge, or null if none exists
   */
  findActiveChallengeByChannel(
    userId: string,
    channel: MfaChallengeChannel,
  ): Promise<TwoFactorChallenge | null> {
    return this.prisma.twoFactorChallenge.findFirst({
      where: {
        userId,
        channel,
        consumed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve all users with pagination and filtering of a tenant
   * Supports search, filtering by status, relations, and date ranges
   * @param queries - Filter and pagination parameters (TenantUserFilterDto)
   * @param tenantId - Tenant ID to scope the query
   * @returns Promise resolving to paginated user data with metadata
   */
  async getAllUsers(queries: TenantUserFilterDto, tenantId: string) {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(queries);

    // Build tenant-scoped where clause with filters
    const where = this.buildTenantUserFilter(tenantId, filterParams);

    const total = await this.prisma.user.count({ where });

    const meta = generatePaginationMeta({
      ...paginationData,
      total,
    });

    const users = await this.prisma.user.findMany({
      where,
      ...paginationPrismaQuery,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profilePhoto: true,
        isActive: true,
        emailVerified: true,
        lastActiveAt: true,
        // Include assigned roles within this tenant
        userAssignments: {
          where: { tenantId },
          select: {
            id: true,
            accessScope: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      data: users,
      meta,
    };
  }

  /**
   * Get current authenticated user's extended profile with comprehensive details
   * @param userId - The user's unique identifier
   * @param tenantId - Tenant ID to scope role assignments
   * @returns Promise resolving to the user with full details
   * @throws {NotFoundException} If the user is not found
   */
  async getMe(userId: string, tenantId: string) {
    return this.getUser(userId, tenantId);
  }

  /**
   * Get a user by their unique ID with comprehensive details
   * @param id - The user's unique identifier
   * @param tenantId - Tenant ID to scope role assignments
   * @returns Promise resolving to the user with full details
   * @throws {NotFoundException} If the user is not found
   */
  async getUser(id: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        // Basic Info
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profilePhoto: true,

        // Status
        isActive: true,
        emailVerified: true,
        onboardingStatus: true,
        onboardingCompletedAt: true,

        // Activity Tracking
        lastLoginAt: true,
        lastLoginIp: true,
        lastActiveAt: true,
        passwordChangedAt: true,
        createdAt: true,

        // Security Info
        twoFactorEnabled: true,
        twoFactorType: true,
        twoFactorEnforced: true,
        failedLoginAttempts: true,
        lockedUntil: true,

        // Trusted Devices
        trustedDevices: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            label: true,
            userAgent: true,
            ipAddress: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { lastUsedAt: 'desc' },
        },

        // Role Assignments (tenant-scoped)
        userAssignments: {
          where: { tenantId },
          select: {
            id: true,
            assignedAt: true,
            role: {
              select: {
                name: true,
              },
            },
            location: {
              select: {
                name: true,
              },
            },
            assignedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            assignedById: true,
          },
        },

        // Preferences
        preferences: {
          select: {
            timezone: true,
            language: true,
            theme: true,
            emailNotifications: true,
            smsNotifications: true,
            pushNotifications: true,
          },
        },

        // Address
        address: {
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Transform userAssignments to flattened format
    const roleAssignments = user.userAssignments.map(
      (assignment: {
        role: { name: string };
        location: { name: string } | null;
        assignedAt: Date;
        assignedBy: { firstName: string; lastName: string } | null;
      }) => ({
        role: assignment.role.name,
        location: assignment.location?.name ?? null,
        assignedAt: assignment.assignedAt,
        assignerName: assignment.assignedBy
          ? `${assignment.assignedBy.firstName} ${assignment.assignedBy.lastName}`
          : null,
      }),
    );

    // Omit raw userAssignments from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userAssignments: _rawAssignments, ...userData } = user;

    // Return with computed fields and transformed data
    return {
      ...userData,

      trustedDevicesCount: (user.trustedDevices as unknown[]).length,
      roleAssignments,
    };
  }

  /**
   * Update current user's own profile
   * @param id - The user's unique identifier
   * @param body - The update data (only self-editable fields)
   * @returns Promise resolving to the updated user
   * @throws {NotFoundException} If the user is not found
   */
  async updateMe(id: string, body: UpdateMeDto) {
    const isExist = await this.prisma.user.findUnique({ where: { id } });
    if (!isExist) {
      throw new NotFoundException('User not found');
    }

    const { preferences, ...rest } = body;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(preferences && {
          preferences: {
            update: {
              ...preferences,
            },
          },
        }),
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Build Prisma where conditions for tenant-scoped user queries.
   * Explicit filter handling with support for search, relations, and date ranges.
   *
   * @param tenantId - Tenant ID to scope the query
   * @param filter - Filter parameters from TenantUserFilterDto
   * @returns Prisma.UserWhereInput for use in findMany
   */
  buildTenantUserFilter(
    tenantId: string,
    filter: {
      search?: string;
      name?: string;
      email?: string;
      phoneNumber?: string;
      isActive?: boolean;
      emailVerified?: boolean;
      roleId?: string;
      locationId?: string;
      createdFrom?: Date;
      createdTo?: Date;
      lastActiveFrom?: Date;
      lastActiveTo?: Date;
    },
  ): Prisma.UserWhereInput {
    const whereConditions: Prisma.UserWhereInput[] = [];

    // ─────────────────────────────────────────────────────────────
    // 1. Tenant Scope (Required)
    // ─────────────────────────────────────────────────────────────
    whereConditions.push({
      tenants: { some: { id: tenantId } },
    });

    // ─────────────────────────────────────────────────────────────
    // 2. Global Search (across name and email)
    // ─────────────────────────────────────────────────────────────
    if (filter.search) {
      const searchTerm = filter.search;
      whereConditions.push({
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. User Field Filters
    // ─────────────────────────────────────────────────────────────
    if (filter.name) {
      // Split name into words and match each word against firstName OR lastName
      const nameParts = filter.name.trim().split(/\s+/).filter(Boolean);

      if (nameParts.length === 1) {
        // Single word: match against firstName OR lastName
        whereConditions.push({
          OR: [
            { firstName: { contains: nameParts[0], mode: 'insensitive' } },
            { lastName: { contains: nameParts[0], mode: 'insensitive' } },
          ],
        });
      } else {
        // Multiple words: ALL words must match somewhere in firstName OR lastName
        const nameConditions: Prisma.UserWhereInput[] = nameParts.map(
          (part) => ({
            OR: [
              { firstName: { contains: part, mode: 'insensitive' as const } },
              { lastName: { contains: part, mode: 'insensitive' as const } },
            ],
          }),
        );
        whereConditions.push({ AND: nameConditions });
      }
    }

    if (filter.email) {
      whereConditions.push({
        email: { contains: filter.email, mode: 'insensitive' },
      });
    }

    if (filter.phoneNumber) {
      whereConditions.push({
        phoneNumber: { contains: filter.phoneNumber, mode: 'insensitive' },
      });
    }

    if (filter.isActive !== undefined) {
      whereConditions.push({ isActive: filter.isActive });
    }

    if (filter.emailVerified !== undefined) {
      whereConditions.push({
        emailVerified: filter.emailVerified ? { not: null } : null,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Relation Filters (Role & Location)
    // ─────────────────────────────────────────────────────────────
    if (filter.roleId) {
      whereConditions.push({
        userAssignments: {
          some: {
            roleId: filter.roleId,
            tenantId,
          },
        },
      });
    }

    if (filter.locationId) {
      whereConditions.push({
        userAssignments: {
          some: {
            locationId: filter.locationId,
            tenantId,
          },
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Date Range Filters
    // ─────────────────────────────────────────────────────────────
    if (filter.createdFrom) {
      whereConditions.push({ createdAt: { gte: filter.createdFrom } });
    }

    if (filter.createdTo) {
      whereConditions.push({ createdAt: { lte: filter.createdTo } });
    }

    if (filter.lastActiveFrom) {
      whereConditions.push({ lastActiveAt: { gte: filter.lastActiveFrom } });
    }

    if (filter.lastActiveTo) {
      whereConditions.push({ lastActiveAt: { lte: filter.lastActiveTo } });
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Combine all conditions with AND
    // ─────────────────────────────────────────────────────────────
    return whereConditions.length > 0 ? { AND: whereConditions } : {};
  }
}
