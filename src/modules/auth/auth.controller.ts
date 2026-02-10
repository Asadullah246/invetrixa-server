import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import {
  AuthenticatedResponse,
  AuthService,
  SessionStateSnapshot,
  SessionUser,
} from './auth.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { SendChallengeDto } from './dto/send-challenge.dto';
import { TotpSetupResponseDto } from './dto/totp-setup.response';
import { BackupCodesResponseDto } from './dto/backup-codes.response';
import {
  AdminEnforceTwoFactorDto,
  EnforceTwoFactorDto,
} from './dto/enforce-two-factor.dto';
import {
  SessionListMetaDto,
  SessionListResponseDto,
  SessionSummaryDto,
} from './dto/session.response';
import { ListSessionsQueryDto } from './dto/list-sessions.query.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import { UserPreferenceDto } from './dto/user-preference.dto';
import {
  TenantCreationDto,
  TenantResponseDto,
  tenantUpdateDto,
} from '../tenants/dto/body';
import { AccessControlGuard } from '../access-control/access-control.guard';
import getHeaderValue from '@/common/utils/header-extractor';
import { ApiResponses } from '@/common/dto/api-responses';
import { SkipOnboardingCheck } from './decorators/skip-onboarding-check.decorator';

type PassportLogInFn = (
  this: Request,
  user: SessionUser,
  done: (err?: unknown) => void,
) => void;

type PassportLogoutFn = (this: Request, done: (err?: unknown) => void) => void;

type SessionDestroyFn = (this: unknown, done: (err?: unknown) => void) => void;

@ApiTags('Auth')
@Controller('auth')
@SkipOnboardingCheck() // All auth routes skip onboarding check
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiResponses({
    summary: 'Register a new user and create a session',
    type: RegisterResponseDto,
    path: '/auth/register',
    method: 'POST',
    requiredAuth: false,
    responses: [{ statusCode: 400 }, { statusCode: 409 }],
  })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Req() request: Request,
    @Body() dto: RegisterDto,
  ): Promise<AuthenticatedResponse> {
    const {
      response,
      sessionUser,
    }: {
      response: AuthenticatedResponse;
      sessionUser: SessionUser;
    } = await this.authService.register(dto);

    await this.persistSession(
      request,
      sessionUser,
      this.getDeviceLabel(request),
    );

    return response;
  }

  @ApiResponses({
    summary: 'Authenticate with email and password',
    path: '/auth/login',
    method: 'POST',
    requiredAuth: false,
    skipDefaultResponse: true,
    responses: [
      { type: LoginResponseDto, statusCode: 200 },
      { statusCode: 400 },
      { statusCode: 404 },
    ],
  })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() request: Request,
    @Body() credentials: LoginDto,
  ): Promise<AuthenticatedResponse> {
    void credentials;
    const sessionUser = request.user as SessionUser;
    await this.authService.ensureSessionMetadata(
      request,
      sessionUser,
      this.getDeviceLabel(request),
    );
    return this.authService.getAuthenticatedUserFromSession(sessionUser);
  }

  @ApiResponses({
    summary: 'Terminate the current session',
    path: '/auth/logout',
    method: 'POST',
    responses: [
      {
        statusCode: 204,
        description: 'Session terminated successfully',
      },
    ],
  })
  @Post('logout')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request): Promise<void> {
    await this.destroyCurrentSession(request);
  }

  @ApiResponses({
    summary: 'Retrieve the currently authenticated user',
    path: '/auth/me',
    method: 'GET',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async me(@Req() request: Request): Promise<AuthenticatedResponse> {
    const snapshot = this.getSessionSnapshot(request);

    if (!snapshot) {
      throw new UnauthorizedException('Session not found.');
    }

    return this.authService.getAuthenticatedUserFromSession(snapshot);
  }

  @ApiResponses({
    summary: 'List all active sessions for the current user',
    path: '/auth/sessions',
    method: 'GET',
    type: [SessionSummaryDto],
    meta: SessionListMetaDto,
    responses: [{ statusCode: 401 }, { statusCode: 403 }],
  })
  @Get('sessions')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async listSessions(
    @Req() request: Request,
    @Query() query: ListSessionsQueryDto,
  ): Promise<SessionListResponseDto> {
    const snapshot = this.getSessionSnapshot(request);

    if (!snapshot) {
      throw new UnauthorizedException('Session not found.');
    }

    const result = await this.authService.listActiveSessions(
      snapshot.id,
      this.getSessionId(request),
      {
        page: query.page,
        pageSize: query.pageSize,
      },
    );

    const items = result.items.map((session) => new SessionSummaryDto(session));
    const meta: SessionListMetaDto = {
      page: result.page,
      limit: result.pageSize,
      skip: Math.max(0, (result.page - 1) * result.pageSize),
      total: result.totalItems,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
    };

    return {
      data: items,
      meta,
    } satisfies SessionListResponseDto;
  }

  @ApiResponses({
    summary: 'Revoke a specific session by ID',
    path: '/auth/sessions/:sessionId',
    method: 'DELETE',
    responses: [
      { statusCode: 204, description: 'Session revoked successfully' },
    ],
  })
  @Delete('sessions/:sessionId')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    const snapshot = this.getSessionSnapshot(request);
    if (!snapshot) {
      throw new UnauthorizedException('Session not found.');
    }

    const currentSessionId = this.getSessionId(request);
    if (currentSessionId && sessionId === currentSessionId) {
      await this.destroyCurrentSession(request);
      return;
    }

    await this.authService.revokeSession(snapshot.id, sessionId);
  }

  @ApiResponses({
    summary:
      'Revoke all sessions, optionally keeping the current session active',
    path: '/auth/sessions',
    method: 'DELETE',
    responses: [
      { statusCode: 204, description: 'All sessions revoked successfully' },
    ],
  })
  @Delete('sessions')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllSessions(
    @Req() request: Request,
    @Query('keepCurrent') keepCurrentQuery?: string,
  ): Promise<void> {
    const snapshot = this.getSessionSnapshot(request);
    if (!snapshot) {
      throw new UnauthorizedException('Session not found.');
    }

    const keepCurrent = this.toBoolean(keepCurrentQuery);
    const currentSessionId = this.getSessionId(request);

    await this.authService.revokeAllSessions(snapshot.id, {
      keepSessionId:
        keepCurrent && currentSessionId ? currentSessionId : undefined,
    });

    if (!keepCurrent && currentSessionId) {
      await this.destroyCurrentSession(request);
    }
  }

  @ApiResponses({
    summary: 'Verify an email address using a verification token',
    path: '/auth/email/verify',
    method: 'POST',
    responses: [
      { statusCode: 200, description: 'Email verified successfully' },
    ],
  })
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto.token);
  }

  @ApiResponses({
    summary: 'Resend the email verification link',
    path: '/auth/email/resend-verification',
    method: 'POST',
    responses: [
      {
        statusCode: 200,
        description: 'Verification email resent successfully',
        type: ResendVerificationResponseDto,
      },
    ],
  })
  @Post('email/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<ResendVerificationResponseDto> {
    await this.authService.resendEmailVerification(dto.email);
    return {
      message: 'Verification email resent successfully',
      data: null,
    };
  }

  @ApiResponses({
    summary: 'Request a password reset email',
    path: '/auth/password/reset/request',
    method: 'POST',
    responses: [
      {
        statusCode: 200,
        description: 'Password reset email sent successfully',
      },
    ],
  })
  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<void> {
    await this.authService.requestPasswordReset(dto.email);
  }

  @ApiResponses({
    summary: 'Reset a password using a reset token',
    path: '/auth/password/reset/confirm',
    method: 'POST',
    responses: [
      { statusCode: 200, description: 'Password reset successfully' },
    ],
  })
  @Post('password/reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  // ====================
  // onboarding steps api here
  // ====================

  // user preference api here

  @ApiResponses({
    summary: 'Get onboarding user preference data for the current user',
    path: '/auth/onboarding/user-preference',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('onboarding/user-preference')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async completeUserpreference(
    @Req() request: Request,
    @Body() dto: UserPreferenceDto,
  ): Promise<AuthenticatedResponse> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    const response = await this.authService.completeUserPreference(
      sessionUser.id,
      dto,
    );

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await this.persistSession(
        request,
        refreshedSessionUser,
        this.getDeviceLabel(request),
      );
    }

    return response;
  }

  @ApiResponses({
    summary: 'Create tenant during onboarding (step 2)',
    path: '/auth/onboarding/tenant-creation',
    method: 'POST',
    skipDefaultResponse: true,
    responses: [
      { statusCode: 200, type: TenantResponseDto },
      { statusCode: 400 },
      { statusCode: 409 },
    ],
  })
  @Post('onboarding/tenant-creation')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTenantOnboarding(
    @Req() request: Request,
    @Body() dto: TenantCreationDto,
  ): Promise<TenantResponseDto> {
    const sessionUser = request.user as SessionUser | undefined;
    if (!sessionUser || !sessionUser.id) {
      throw new UnauthorizedException('User not found in session.');
    }

    const tenant = await this.authService.createTenantOnboarding(
      sessionUser.id,
      dto,
    );

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await this.persistSession(
        request,
        refreshedSessionUser,
        this.getDeviceLabel(request),
      );
    }

    return tenant;
  }

  @ApiResponses({
    summary: 'Update tenant settings during onboarding (step 3)',
    path: '/auth/onboarding/tenant-setting',
    method: 'POST',
    skipDefaultResponse: true,
    responses: [
      { statusCode: 200, type: tenantUpdateDto },
      { statusCode: 400 },
      { statusCode: 409 },
    ],
  })
  @Post('onboarding/tenant-setting')
  @UseGuards(AuthenticatedGuard, AccessControlGuard)
  // @RequirePermission('tenant', 'update')
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

    const settings = await this.authService.updateTenantSettings(
      sessionUser.id,
      dto,
      tenantId,
    );

    const refreshedSessionUser = await this.authService.deserializeUser(
      sessionUser.id,
      sessionUser,
    );

    if (refreshedSessionUser) {
      await this.persistSession(
        request,
        refreshedSessionUser,
        this.getDeviceLabel(request),
      );
    }

    return settings;
  }

  private async persistSession(
    request: Request,
    sessionUser: SessionUser,
    deviceLabel?: string | null,
  ): Promise<void> {
    if (typeof request.logIn !== 'function') {
      throw new UnauthorizedException('Session support is not available.');
    }

    // new added Regenerate session to prevent session fixation
    await new Promise<void>((resolve, reject) => {
      request.session.regenerate((err) => {
        if (err) {
          reject(
            err instanceof Error
              ? err
              : new Error(this.formatUnknownError(err)),
          );
          return;
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.apply(request.logIn as PassportLogInFn, request, [
        sessionUser,
        (error?: unknown) => {
          if (error) {
            reject(
              error instanceof Error
                ? error
                : new Error(this.formatUnknownError(error)),
            );
            return;
          }
          resolve();
        },
      ]);
    });
    await this.authService.ensureSessionMetadata(
      request,
      sessionUser,
      deviceLabel ?? this.getDeviceLabel(request),
    );
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Initiate TOTP setup for two-factor authentication',
    path: '/auth/two-factor/setup/totp',
    method: 'POST',
    responses: [{ statusCode: 200, type: TotpSetupResponseDto }],
  })
  @Post('two-factor/setup/totp')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async initiateTotpSetup(
    @Req() request: Request,
  ): Promise<TotpSetupResponseDto> {
    const sessionUser = request.user as SessionUser;
    return this.authService.initiateTotpSetup(sessionUser.id);
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Send an out-of-band two-factor challenge',
    path: '/auth/two-factor/send-challenge',
    method: 'POST',
    responses: [
      { statusCode: 204, description: 'Challenge sent successfully' },
    ],
  })
  @Post('two-factor/send-challenge')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendChallenge(
    @Req() request: Request,
    @Body() dto: SendChallengeDto,
  ): Promise<void> {
    const sessionUser = request.user as SessionUser;
    await this.authService.sendTwoFactorChallenge(sessionUser.id, dto);
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Verify a two-factor challenge response',
    path: '/auth/two-factor/verify',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('two-factor/verify')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: VerifyTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    const sessionUser = request.user as SessionUser;
    const result = await this.authService.verifyTwoFactor(
      sessionUser.id,
      dto,
      request,
      response,
    );
    await this.persistSession(
      request,
      result.sessionUser,
      dto.deviceLabel ?? this.getDeviceLabel(request),
    );
    return result.response;
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Enable two-factor authentication',
    path: '/auth/two-factor/enable',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('two-factor/enable')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: EnableTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    const sessionUser = request.user as SessionUser;
    const result = await this.authService.enableTwoFactor(
      sessionUser.id,
      dto,
      request,
      response,
    );
    await this.persistSession(
      request,
      result.sessionUser,
      dto.deviceLabel ?? this.getDeviceLabel(request),
    );
    return result.response;
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Disable two-factor authentication',
    path: '/auth/two-factor/disable',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('two-factor/disable')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @Req() request: Request,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    const sessionUser = request.user as SessionUser;
    const result = await this.authService.disableTwoFactor(sessionUser.id, dto);
    await this.persistSession(
      request,
      result.sessionUser,
      this.getDeviceLabel(request),
    );
    return result.response;
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Generate new two-factor backup codes',
    path: '/auth/two-factor/backup-codes',
    method: 'POST',
    responses: [{ statusCode: 200, type: BackupCodesResponseDto }],
  })
  @Post('two-factor/backup-codes')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async generateBackupCodes(
    @Req() request: Request,
  ): Promise<BackupCodesResponseDto> {
    const sessionUser = request.user as SessionUser;
    return this.authService.generateBackupCodes(sessionUser.id);
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Toggle enforcement of two-factor authentication',
    path: '/auth/two-factor/enforce',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('two-factor/enforce')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async enforceTwoFactor(
    @Req() request: Request,
    @Body() dto: EnforceTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    const sessionUser = request.user as SessionUser;
    const result = await this.authService.enforceTwoFactorForCurrentUser(
      sessionUser.id,
      dto,
    );
    await this.persistSession(
      request,
      result.sessionUser,
      this.getDeviceLabel(request),
    );
    return result.response;
  }

  @ApiExcludeEndpoint()
  @ApiResponses({
    summary: 'Administratively enforce two-factor authentication for a user',
    path: '/auth/two-factor/admin/enforce',
    method: 'POST',
    responses: [{ statusCode: 200, type: RegisterResponseDto }],
  })
  @Post('two-factor/admin/enforce')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async adminEnforceTwoFactor(
    @Req() request: Request,
    @Body() dto: AdminEnforceTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    const response = await this.authService.adminEnforceTwoFactor(dto);

    const sessionUser = request.user as SessionUser | undefined;
    if (sessionUser && sessionUser.id === dto.userId) {
      const refreshedSessionUser = await this.authService.deserializeUser(
        sessionUser.id,
        sessionUser,
      );

      if (refreshedSessionUser) {
        await this.persistSession(
          request,
          refreshedSessionUser,
          this.getDeviceLabel(request),
        );
      }
    }

    return response;
  }

  private getSessionSnapshot(
    request: Request,
  ): SessionStateSnapshot | undefined {
    const candidate = request.user as Partial<SessionStateSnapshot> | undefined;
    const snapshot =
      this.normalizeSnapshot(candidate) ??
      this.normalizeSnapshot(
        (request.session as { passport?: { user?: unknown } } | undefined)
          ?.passport?.user as Partial<SessionStateSnapshot> | undefined,
      );

    return snapshot;
  }

  private normalizeSnapshot(
    candidate: Partial<SessionStateSnapshot> | undefined,
  ): SessionStateSnapshot | undefined {
    if (
      candidate &&
      typeof candidate.id === 'string' &&
      candidate.id.length > 0
    ) {
      return {
        id: candidate.id,
        requiresTwoFactor: candidate.requiresTwoFactor ?? false,
        twoFactorVerified: candidate.twoFactorVerified ?? false,
      };
    }
    return undefined;
  }

  private getSessionId(request: Request): string | undefined {
    if (typeof request.sessionID === 'string' && request.sessionID.length > 0) {
      return request.sessionID;
    }

    const session = request.session as { id?: string } | undefined;
    if (session && typeof session.id === 'string' && session.id.length > 0) {
      return session.id;
    }

    return undefined;
  }

  private getDeviceLabel(request: Request): string | null {
    const header = request.get('x-device-name');
    if (header && header.trim().length > 0) {
      return header.trim().slice(0, 100);
    }
    return null;
  }

  private async destroyCurrentSession(request: Request): Promise<void> {
    const sessionId = this.getSessionId(request);
    const snapshot = this.getSessionSnapshot(request);
    const userId =
      (request.user as SessionUser | undefined)?.id ??
      snapshot?.id ??
      undefined;

    try {
      if (typeof request.logout === 'function') {
        await new Promise<void>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          Reflect.apply(request.logout as PassportLogoutFn, request, [
            (error?: unknown) => {
              if (error) {
                reject(
                  error instanceof Error
                    ? error
                    : new Error(this.formatUnknownError(error)),
                );
                return;
              }
              resolve();
            },
          ]);
        });
      }

      const session = request.session;
      if (!session?.destroy || typeof session.destroy !== 'function') {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        Reflect.apply(session.destroy as SessionDestroyFn, session, [
          (error?: unknown) => {
            if (error) {
              reject(
                error instanceof Error
                  ? error
                  : new Error(this.formatUnknownError(error)),
              );
              return;
            }
            resolve();
          },
        ]);
      });
    } finally {
      if (sessionId) {
        await this.authService.removeSessionArtifacts(sessionId, { userId });
      }
    }
  }

  private toBoolean(value?: string): boolean {
    if (!value) {
      return false;
    }
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
