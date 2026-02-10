import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  OnboardingStatus,
  TenantInvitationStatus,
  AccessScope,
} from 'generated/prisma/client';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SUPER_ADMIN_ROLE } from '@/common/constants/system-roles.constants';
import { EmailService } from '@/common/services/email-service/email.service';
import {
  TenantCreationDto,
  TenantResponseDto,
  TenantAddressResponseDto,
  tenantUpdateDto,
  GetTenantsResponseDto,
  CreateTenantInvitationDto,
  TenantInvitationResponseDto,
} from './dto';
import { TenantRoleInitializerService } from './services/tenant-role-initializer.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private tenantRoleInitializer: TenantRoleInitializerService,
  ) {}

  async createTenant(
    userId: string,
    dto: TenantCreationDto,
  ): Promise<TenantResponseDto> {
    const {
      address,
      tenantSettings,
      website,
      description,
      logo,
      ...tenantData
    } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant - conditionally include optional nullable fields
      const createData = {
        ...tenantData,
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
      } as Prisma.TenantCreateInput;

      const tenant = await tx.tenant.create({
        data: createData,
      });

      // 2. Create Address
      await tx.address.create({
        data: {
          tenantId: tenant.id,
          ...address,
        },
      });

      // 3. Create Settings (optional)
      if (tenantSettings) {
        await tx.tenantSettings.create({
          data: {
            tenantId: tenant.id,
            ...tenantSettings,
          },
        });
      }

      // 4. Initialize default tenant roles and permissions
      await this.tenantRoleInitializer.initializeTenantRoles(
        tx,
        tenant.id,
        'TENANT',
      );

      // 4b. Assign SuperAdmin role to the tenant user
      const superAdminRole = await tx.role.findFirst({
        where: {
          name: SUPER_ADMIN_ROLE,
          tenantId: tenant.id,
        },
      });

      if (superAdminRole) {
        await tx.userAssignment.create({
          data: {
            userId,
            roleId: superAdminRole.id,
            tenantId: tenant.id,
            locationId: null, // tenant-wide access
            assignedById: userId, // Self-assigned during tenant creation
          },
        });
      }

      // 6. Link User ↔ Tenant
      await tx.user.update({
        where: { id: userId },
        data: {
          tenants: { connect: { id: tenant.id } },
        },
      });

      // 7. Update onboarding state
      await tx.onboardingState.upsert({
        where: { userId },
        create: { userId, tenantCreation: true },
        update: { tenantCreation: true },
      });

      // 8. Auto-complete onboarding if all steps done
      await this.checkAndCompleteOnboarding(userId, tx);

      // 9. Return full tenant with relations (NO manual mapping)
      const updatedTenant = await tx.tenant.findUnique({
        where: { id: tenant.id },
        include: {
          tenantSettings: true,
          address: true,
        },
      });
      if (!updatedTenant) {
        throw new NotFoundException('Tenant not found after creation.');
      }

      const {
        address: updateAddress,
        tenantSettings: updatedSettings,
        ...tenantMainData
      } = updatedTenant;

      // Map address to convert null values to undefined
      const mappedAddress: TenantAddressResponseDto = {
        id: updateAddress!.id,
        addressLine1: updateAddress!.addressLine1,
        addressLine2: updateAddress!.addressLine2 ?? undefined,
        city: updateAddress!.city,
        state: updateAddress!.state,
        postalCode: updateAddress!.postalCode,
        country: updateAddress!.country,
        latitude: updateAddress!.latitude ?? undefined,
        longitude: updateAddress!.longitude ?? undefined,
        createdAt: updateAddress!.createdAt,
        updatedAt: updateAddress!.updatedAt,
      };

      const response: TenantResponseDto = {
        ...tenantMainData,
        registrationNumber: updatedTenant.registrationNumber ?? undefined,
        website: updatedTenant.website ?? undefined,
        description: updatedTenant.description ?? undefined,
        logo: updatedTenant.logo ?? undefined,
        address: mappedAddress,
      };

      if (updatedSettings) {
        response.tenantSettings = {
          id: updatedSettings.id,
          defaultPricingMethod: updatedSettings.defaultPricingMethod,
          timezone: updatedSettings.timezone,
          locale: updatedSettings.locale,
          currency: updatedSettings.currency,
          dateFormat: updatedSettings.dateFormat,
          timeFormat: updatedSettings.timeFormat,
          decimalSeparator: updatedSettings.decimalSeparator,
          thousandsSeparator: updatedSettings.thousandsSeparator,
        };
      }
      return response;
    });
    return result;
  }

  async updateTenant(
    userId: string,
    dto: tenantUpdateDto,
    tenantId: string,
  ): Promise<TenantResponseDto> {
    // 1️⃣ Check user access
    const userTenant = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenants: { some: { id: tenantId } },
      },
      select: { id: true },
    });

    if (!userTenant) {
      throw new ForbiddenException(
        'You do not have access to this tenant or tenant not found.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const { tenantSettings, address, ...tenantData } = dto;

      // 2️⃣ Update tenant core info
      await tx.tenant.update({
        where: { id: tenantId },
        data: Object.fromEntries(
          Object.entries(tenantData).filter(([, v]) => v !== undefined),
        ) as Prisma.TenantUpdateInput,
      });

      // 3️⃣ Update address if provided

      if (address) {
        await tx.address.update({
          where: { tenantId },
          data: Object.fromEntries(
            Object.entries(address).filter(([, v]) => v !== undefined),
          ) as Prisma.AddressUpdateInput,
        });
      }

      // 4️⃣ Upsert tenant settings if provided

      if (tenantSettings) {
        await tx.tenantSettings.upsert({
          where: { tenantId },
          create: { tenantId, ...tenantSettings },
          update: Object.fromEntries(
            Object.entries(tenantSettings).filter(([, v]) => v !== undefined),
          ),
        });
      }

      // 5️⃣ Update onboarding state
      await tx.onboardingState.upsert({
        where: { userId },
        create: { userId, tenantSetting: true },
        update: { tenantSetting: true },
      });

      await this.checkAndCompleteOnboarding(userId, tx);

      // 6️⃣ Fetch full tenant for response
      const fullTenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { address: true, tenantSettings: true },
      });

      if (!fullTenant) {
        throw new NotFoundException('Tenant not found.');
      }

      // 7️⃣ Map address
      const mappedAddress: TenantAddressResponseDto = {
        id: fullTenant.address!.id,
        addressLine1: fullTenant.address!.addressLine1,
        addressLine2: fullTenant.address!.addressLine2 ?? undefined,
        city: fullTenant.address!.city,
        state: fullTenant.address!.state,
        postalCode: fullTenant.address!.postalCode,
        country: fullTenant.address!.country,
        latitude: fullTenant.address!.latitude ?? undefined,
        longitude: fullTenant.address!.longitude ?? undefined,
        createdAt: fullTenant.address!.createdAt,
        updatedAt: fullTenant.address!.updatedAt,
      };

      // 8️⃣ Build response
      const mappedSettings = fullTenant.tenantSettings
        ? {
            id: fullTenant.tenantSettings.id,
            defaultPricingMethod:
              fullTenant.tenantSettings.defaultPricingMethod,
            timezone: fullTenant.tenantSettings.timezone,
            locale: fullTenant.tenantSettings.locale,
            currency: fullTenant.tenantSettings.currency,
            dateFormat: fullTenant.tenantSettings.dateFormat,
            timeFormat: fullTenant.tenantSettings.timeFormat,
            decimalSeparator: fullTenant.tenantSettings.decimalSeparator,
            thousandsSeparator: fullTenant.tenantSettings.thousandsSeparator,
          }
        : undefined;

      const response: TenantResponseDto = {
        ...fullTenant,
        registrationNumber: fullTenant.registrationNumber ?? undefined,
        website: fullTenant.website ?? undefined,
        description: fullTenant.description ?? undefined,
        logo: fullTenant.logo ?? undefined,
        address: mappedAddress,
        tenantSettings: mappedSettings,
      };

      return response;
    });

    return result;
  }

  private async checkAndCompleteOnboarding(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    // Get current onboarding state
    const onboardingState = await tx.onboardingState.findUnique({
      where: { userId },
      select: {
        profileComplete: true,
        tenantCreation: true,
        tenantSetting: true,
      },
    });

    // Check if all required steps are complete
    // profileComplete is optional, but tenantCreation and tenantSetting are required
    const allStepsComplete = onboardingState?.tenantCreation === true;
    // &&
    // onboardingState?.tenantSetting === true;

    if (allStepsComplete) {
      // Get current user status
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { onboardingStatus: true },
      });

      // Only update if not already completed
      if (user?.onboardingStatus !== OnboardingStatus.COMPLETED) {
        await tx.user.update({
          where: { id: userId },
          data: {
            onboardingStatus: OnboardingStatus.COMPLETED,
            onboardingCompletedAt: new Date(),
          },
        });
      }
    }
  }

  async deleteTenant(
    userId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    statusCode: number;
    message: string;
    tenantId: string;
  }> {
    // 2 Check if tenant exists and not already deleted
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, deletedAt: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (tenant.deletedAt) {
      throw new ForbiddenException('Tenant is already deleted.');
    }

    // 3 Soft delete the tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(
      `Tenant ${tenantId} (${tenant.name}) soft deleted by user ${userId}`,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Tenant deleted successfully',
      tenantId: tenantId,
    };
  }

  async getTenantsByUser(userId: string): Promise<GetTenantsResponseDto> {
    const result = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenants: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // User is guaranteed to exist by AuthenticatedGuard, return empty array if no tenants
    const tenants = result?.tenants ?? [];

    return {
      success: true,
      statusCode: 200,
      message: 'Tenants retrieved successfully',
      data: tenants,
      total: tenants.length,
    };
  }

  async getSingleTenant(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        address: true,
        tenantSettings: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }
    const { address, tenantSettings, ...tenantMainData } = tenant;

    const tenantData: TenantResponseDto = {
      ...tenantMainData,
      logo: tenant.logo ?? undefined,
      website: tenant.website ?? undefined,
      description: tenant.description ?? undefined,
      registrationNumber: tenant.registrationNumber ?? undefined,
      address: {
        id: address!.id,
        addressLine1: address!.addressLine1,
        addressLine2: address!.addressLine2 ?? undefined,
        city: address!.city,
        state: address!.state,
        postalCode: address!.postalCode,
        country: address!.country,
        latitude: address!.latitude ?? undefined,
        longitude: address!.longitude ?? undefined,
        createdAt: address!.createdAt,
        updatedAt: address!.updatedAt,
      },
      tenantSettings: tenantSettings ? tenantSettings : undefined,
    };

    return tenantData;
  }

  async createTenantInvitation(
    invitedById: string,
    inviterName: string,
    tenantId: string,
    dto: CreateTenantInvitationDto,
  ): Promise<TenantInvitationResponseDto> {
    // 1️⃣ Verify tenant exists and get name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    // 3️⃣ Check if user with this email is already a member of the tenant
    const existingMember = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        tenants: {
          some: { id: tenantId },
        },
      },
      select: { id: true },
    });

    if (existingMember) {
      throw new ConflictException(
        'This user is already a member of this tenant.',
      );
    }

    // 4️⃣ Verify role exists if provided
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, tenantId },
      });

      if (!role) {
        throw new NotFoundException('Role not found in this tenant.');
      }
    }

    // 4️⃣ Generate token and hash for invitation
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 5️⃣ Create the invitation
    const invitation = await this.prisma.tenantInvitation.create({
      data: {
        email: dto.email,
        message: dto.message ?? null,
        tokenHash,
        expiresAt: dto.expiresAt ?? null,
        tenantId,
        invitedById,
        roleId: dto.roleId ?? null,
        status: TenantInvitationStatus.PENDING,
      },
    });

    // 6️⃣ Send invitation email
    await this.emailService.sendTenantInvitationEmail(
      dto.email,
      tenant.name,
      inviterName, // Passed from session data
      token, // Send the raw token, not the hash
      dto.message,
      dto.expiresAt ?? undefined,
    );

    this.logger.log(
      `Invitation email queued for ${dto.email} to join tenant ${tenant.name}`,
    );

    // 7️⃣ Map and return response
    const response: TenantInvitationResponseDto = {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
    };

    return response;
  }

  async getTenantInvitations(
    userId: string,
    tenantId: string,
  ): Promise<TenantInvitationResponseDto[]> {
    // 2️⃣ Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    // 3️⃣ Get all invitations for the tenant
    const invitations = await this.prisma.tenantInvitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // 4️⃣ Map and return response
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      declinedAt: invitation.declinedAt,
      cancelledAt: invitation.cancelledAt,
      tenantId: invitation.tenantId,
      invitedById: invitation.invitedById,
      invitedUserId: invitation.invitedUserId,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    }));
  }

  /**
   * Get all pending invitations for a user by their email
   * Used during login/register to check for pending invitations
   * @param userEmail - The user's email address to search for invitations
   * @returns List of pending invitations with tenant and inviter details
   */
  async getMyPendingInvitations(userEmail: string) {
    const invitations = await this.prisma.tenantInvitation.findMany({
      where: {
        email: userEmail,
        status: TenantInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        logo: invitation.tenant.logo,
      },
      invitedBy: invitation.invitedBy
        ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
        : null,
    }));
  }

  async deleteTenantInvitation(
    userId: string,
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    // 1️⃣ Verify invitation exists and belongs to the tenant
    const invitation = await this.prisma.tenantInvitation.findFirst({
      where: {
        id: invitationId,
        tenantId,
      },
      select: { id: true, status: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found for this tenant.');
    }

    // 2️⃣ Prevent cancellation of already accepted invitations
    if (invitation.status === TenantInvitationStatus.ACCEPTED) {
      throw new ForbiddenException(
        'Cannot cancel an invitation that has already been accepted.',
      );
    }

    // 3️⃣ Also prevent cancelling already cancelled invitations
    if (invitation.status === TenantInvitationStatus.CANCELLED) {
      throw new ForbiddenException(
        'This invitation has already been cancelled.',
      );
    }

    // 4️⃣ Soft delete - update status to CANCELLED
    await this.prisma.tenantInvitation.update({
      where: { id: invitationId },
      data: {
        status: TenantInvitationStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  async acceptInvitation(
    userId: string,
    userEmail: string,
    token: string,
  ): Promise<{
    success: boolean;
    message: string;
    tenantId: string;
  }> {
    // 1️⃣ Hash the token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 2️⃣ Find invitation by token hash
    const invitation = await this.prisma.tenantInvitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid.');
    }

    // 3️⃣ Verify the logged-in user's email matches the invitation email
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'You can only accept invitations sent to your email address.',
      );
    }

    // 4️⃣ Check if expired first
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: TenantInvitationStatus.EXPIRED },
      });
      throw new ForbiddenException(
        'This invitation has expired and can no longer be accepted.',
      );
    }

    // 5️⃣ Validate invitation status with specific messages
    switch (invitation.status) {
      case TenantInvitationStatus.ACCEPTED:
        throw new ConflictException(
          'This invitation has already been accepted.',
        );
      case TenantInvitationStatus.DECLINED:
        throw new ForbiddenException(
          'This invitation was declined and can no longer be accepted.',
        );
      case TenantInvitationStatus.EXPIRED:
        throw new ForbiddenException(
          'This invitation has expired and can no longer be accepted.',
        );
      case TenantInvitationStatus.PENDING:
        break; // Valid status, proceed
      default:
        throw new ForbiddenException('This invitation is no longer valid.');
    }

    // 5️⃣ Accept invitation in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.tenantInvitation.update({
        where: { id: invitation.id },
        data: {
          status: TenantInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          invitedUserId: userId,
        },
      });

      // Link user to tenant
      await tx.user.update({
        where: { id: userId },
        data: {
          tenants: { connect: { id: invitation.tenantId } },
        },
      });

      // Assign role if provided
      if (invitation.roleId) {
        await tx.userAssignment.create({
          data: {
            userId,
            roleId: invitation.roleId,
            tenantId: invitation.tenantId,
            accessScope: AccessScope.TENANT,
            locationId: null,
            assignedById: invitation.invitedById, // Assigned by the invitation creator
          },
        });
      }

      // Set onboarding status to completed since user now has a tenant
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingStatus: OnboardingStatus.COMPLETED,
          onboardingCompletedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message: `Invitation accepted. You are now a member of ${invitation.tenant.name}.`,
      tenantId: invitation.tenantId,
    };
  }

  async declineInvitation(
    userId: string,
    token: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // 1️⃣ Hash the token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 2️⃣ Find invitation by token hash
    const invitation = await this.prisma.tenantInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid.');
    }

    // 3️⃣ Check if expired first
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: TenantInvitationStatus.EXPIRED },
      });
      throw new ForbiddenException(
        'This invitation has expired and can no longer be declined.',
      );
    }

    // 4️⃣ Validate invitation status with specific messages
    switch (invitation.status) {
      case TenantInvitationStatus.ACCEPTED:
        throw new ConflictException(
          'This invitation has already been accepted and cannot be declined.',
        );
      case TenantInvitationStatus.DECLINED:
        throw new ConflictException(
          'This invitation has already been declined.',
        );
      case TenantInvitationStatus.EXPIRED:
        throw new ForbiddenException(
          'This invitation has expired and can no longer be declined.',
        );
      case TenantInvitationStatus.PENDING:
        break; // Valid status, proceed
      default:
        throw new ForbiddenException('This invitation is no longer valid.');
    }

    // 4️⃣ Decline invitation
    await this.prisma.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        status: TenantInvitationStatus.DECLINED,
        declinedAt: new Date(),
        invitedUserId: userId,
      },
    });

    return {
      success: true,
      message: 'Invitation declined.',
    };
  }

  async removeTenantMember(
    removedById: string,
    tenantId: string,
    targetUserId: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    statusCode: number;
    message: string;
  }> {
    // 1️⃣ Verify tenant exists and get name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    // 2️⃣ Verify target user is a member of the tenant
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        tenants: { some: { id: tenantId } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'User not found or is not a member of this tenant.',
      );
    }

    // 3️⃣ Check if target user has SuperAdmin role in this tenant
    const hasSuperAdminRole = await this.prisma.userAssignment.findFirst({
      where: {
        userId: targetUserId,
        tenantId,
        role: {
          name: SUPER_ADMIN_ROLE,
        },
      },
      select: { id: true },
    });

    if (hasSuperAdminRole) {
      throw new ForbiddenException(
        'Cannot remove the SuperAdmin from the tenant. Transfer ownership first.',
      );
    }

    // 4️⃣ Remove member in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Remove all role assignments for this user in this tenant
      await tx.userAssignment.deleteMany({
        where: {
          userId: targetUserId,
          tenantId,
        },
      });

      // Disconnect user from tenant
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          tenants: { disconnect: { id: tenantId } },
        },
      });

      // Create audit record
      await tx.tenantMemberRemoval.create({
        data: {
          userId: targetUserId,
          tenantId,
          removedById,
          reason: reason ?? null,
        },
      });
    });

    // 5️⃣ Send notification email
    const userName = `${targetUser.firstName} ${targetUser.lastName}`.trim();
    await this.emailService.sendMemberRemovalEmail(
      targetUser.email,
      userName || targetUser.email,
      tenant.name,
      reason,
    );

    this.logger.log(
      `User ${targetUserId} removed from tenant ${tenant.name} by ${removedById}`,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Member removed from tenant successfully.',
    };
  }
}
