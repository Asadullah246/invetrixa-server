import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import {
  TenantCreationDto,
  TenantResponseDto,
  tenantUpdateDto,
  GetTenantsResponseDto,
  CreateTenantInvitationDto,
  TenantInvitationResponseDto,
  GetTenantInvitationsResponseDto,
  AcceptInvitationDto,
  DeclineInvitationDto,
  RemoveTenantMemberDto,
  RemoveTenantMemberResponseDto,
} from './dto/body';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import getHeaderValue from '@/common/utils/header-extractor';
import { AuthService, SessionUser } from '../auth/auth.service';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import {
  getDeviceLabel,
  persistSessionBase,
} from '@/common/utils/session-utils';
import { SkipOnboardingCheck } from '../auth/decorators/skip-onboarding-check.decorator';
import { UnitTypesService } from './services/unit-types.service';
import { UpsertUnitTypesDto } from './dto/unit-types.dto';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
  ApiAction,
} from '@/common/decorator/api';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly authService: AuthService,
    private readonly unitTypesService: UnitTypesService,
  ) {}

  @ApiGetAll('Get all tenants for current user', {
    type: GetTenantsResponseDto,
  })
  @Get('')
  @UseGuards(AuthenticatedGuard)
  @SkipOnboardingCheck()
  @HttpCode(HttpStatus.OK)
  async getMyTenants(@Req() request: Request): Promise<GetTenantsResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    return await this.tenantsService.getTenantsByUser(sessionUser.id);
  }

  @ApiGetAll('Get pending invitations for current user', {
    description: 'Returns pending invitations for the authenticated user',
  })
  @Get('my-invitations')
  @UseGuards(AuthenticatedGuard)
  @SkipOnboardingCheck()
  @HttpCode(HttpStatus.OK)
  async getMyPendingInvitations(@Req() request: Request) {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.email) {
      throw new UnauthorizedException('User not found in session.');
    }

    const data = await this.tenantsService.getMyPendingInvitations(
      sessionUser.email,
    );

    return {
      success: true,
      data,
      total: data.length,
    };
  }

  @ApiGetOne('Get single tenant by ID', { type: TenantResponseDto })
  @Get('current')
  @RequirePermission('Tenant', 'tenant.view')
  @HttpCode(HttpStatus.OK)
  async getSingleTenant(
    @TenantId() tenantId: string,
  ): Promise<TenantResponseDto> {
    return await this.tenantsService.getSingleTenant(tenantId);
  }

  @ApiCreate('Create tenant', {
    type: TenantResponseDto,
    additionalResponses: [
      { status: 409, description: 'Tenant already exists' },
    ],
  })
  @Post('')
  @UseGuards(AuthenticatedGuard)
  @SkipOnboardingCheck()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Req() request: Request,
    @Body() dto: TenantCreationDto,
  ): Promise<TenantResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    const tenant = await this.tenantsService.createTenant(sessionUser.id, dto);

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await persistSessionBase(request, refreshedSessionUser);
      await this.authService.ensureSessionMetadata(
        request,
        refreshedSessionUser,
        getDeviceLabel(request),
      );
    }

    return tenant;
  }

  @ApiCreate('Create tenant invitation', { type: TenantInvitationResponseDto })
  @Post('/invitations')
  @RequirePermission('Tenant', 'tenant.invitation.create')
  @HttpCode(HttpStatus.CREATED)
  async createTenantInvitation(
    @Req() request: Request,
    @Body() dto: CreateTenantInvitationDto,
  ): Promise<TenantInvitationResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }
    const tenantId = getHeaderValue(request, 'x-tenant-id');

    if (!tenantId) {
      throw new UnauthorizedException('Tenant id not found.');
    }

    const inviterName =
      sessionUser.firstName && sessionUser.lastName
        ? `${sessionUser.firstName} ${sessionUser.lastName}`
        : sessionUser.email;

    return await this.tenantsService.createTenantInvitation(
      sessionUser.id,
      inviterName,
      tenantId,
      dto,
    );
  }

  @ApiGetAll('Get all tenant invitations', {
    type: GetTenantInvitationsResponseDto,
  })
  @Get('/invitations')
  @RequirePermission('Tenant', 'tenant.invitation.view')
  @HttpCode(HttpStatus.OK)
  async getTenantInvitations(
    @Req() request: Request,
  ): Promise<GetTenantInvitationsResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }
    const tenantId = getHeaderValue(request, 'x-tenant-id');

    if (!tenantId) {
      throw new UnauthorizedException('Tenant id not found.');
    }

    const data = await this.tenantsService.getTenantInvitations(
      sessionUser.id,
      tenantId,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Invitations retrieved successfully',
      data,
      total: data.length,
    };
  }

  @ApiDelete('Cancel tenant invitation')
  @Patch('invitations/:invitationId')
  @RequirePermission('Tenant', 'tenant.invitation.cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenantInvitation(
    @Req() request: Request,
    @Param('invitationId') invitationId: string,
  ): Promise<void> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }
    const tenantId = getHeaderValue(request, 'x-tenant-id');

    if (!tenantId) {
      throw new UnauthorizedException('Tenant id not found.');
    }

    await this.tenantsService.deleteTenantInvitation(
      sessionUser.id,
      tenantId,
      invitationId,
    );
  }

  @ApiUpdate('Update tenant settings', {
    type: tenantUpdateDto,
    additionalResponses: [{ status: 409, description: 'Conflict' }],
  })
  @Patch('')
  @RequirePermission('Tenant', 'tenant.update')
  @HttpCode(HttpStatus.OK)
  async updateTenantSettings(
    @Req() request: Request,
    @Body() dto: tenantUpdateDto,
  ): Promise<tenantUpdateDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }
    const tenantId = getHeaderValue(request, 'x-tenant-id');

    if (!tenantId) {
      throw new UnauthorizedException('Tenant id not found.');
    }

    const settings = await this.tenantsService.updateTenant(
      sessionUser.id,
      dto,
      tenantId,
    );

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await persistSessionBase(request, refreshedSessionUser);
      await this.authService.ensureSessionMetadata(
        request,
        refreshedSessionUser,
        getDeviceLabel(request),
      );
    }

    return settings;
  }

  @ApiAction('Accept tenant invitation', {
    description: 'Accept a pending invitation to join a tenant',
  })
  @Post('invitations/accept')
  @UseGuards(AuthenticatedGuard)
  @SkipOnboardingCheck()
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Req() request: Request,
    @Body() dto: AcceptInvitationDto,
  ): Promise<{
    success: boolean;
    message: string;
    tenantId: string;
  }> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    const result = await this.tenantsService.acceptInvitation(
      sessionUser.id,
      sessionUser.email,
      dto.token,
    );

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await persistSessionBase(request, refreshedSessionUser);
      await this.authService.ensureSessionMetadata(
        request,
        refreshedSessionUser,
        getDeviceLabel(request),
      );
    }

    return result;
  }

  @ApiAction('Decline tenant invitation', {
    description: 'Decline a pending invitation to join a tenant',
  })
  @Post('invitations/decline')
  @UseGuards(AuthenticatedGuard)
  @SkipOnboardingCheck()
  @HttpCode(HttpStatus.OK)
  async declineInvitation(
    @Req() request: Request,
    @Body() dto: DeclineInvitationDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    return await this.tenantsService.declineInvitation(
      sessionUser.id,
      dto.token,
    );
  }

  @ApiDelete('Delete tenant')
  @Delete('')
  @RequirePermission('Tenant', 'tenant.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(
    @CurrentUserId() userId: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    await this.tenantsService.deleteTenant(userId, tenantId);
  }

  @ApiAction('Remove a member from a tenant', {
    type: RemoveTenantMemberResponseDto,
  })
  @Post('members/remove')
  @RequirePermission('Tenant', 'tenant.member.remove')
  @HttpCode(HttpStatus.OK)
  async removeTenantMember(
    @Req() request: Request,
    @Body() dto: RemoveTenantMemberDto,
  ): Promise<RemoveTenantMemberResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    const tenantId = getHeaderValue(request, 'x-tenant-id');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required.');
    }

    return this.tenantsService.removeTenantMember(
      sessionUser.id,
      tenantId,
      dto.userId,
      dto.reason,
    );
  }

  // ==================== UNIT TYPES ====================

  @ApiGetAll('Get unit types for tenant')
  @Get('unit-types')
  @RequirePermission('Tenant', 'tenant.view')
  @HttpCode(HttpStatus.OK)
  async getUnitTypes(@TenantId() tenantId: string) {
    return this.unitTypesService.getUnitTypes(tenantId);
  }

  @ApiUpdate('Create or update unit types for tenant')
  @Patch('unit-types')
  @RequirePermission('Tenant', 'tenant.update')
  @HttpCode(HttpStatus.OK)
  async upsertUnitTypes(
    @TenantId() tenantId: string,
    @Body() dto: UpsertUnitTypesDto,
  ) {
    return this.unitTypesService.upsertUnitTypes(tenantId, dto);
  }
}
