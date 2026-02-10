import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { hash, verify } from 'argon2';
import {
  Prisma,
  OnboardingStatus,
  TwoFactorType,
  MfaChallengeChannel,
  VerificationTokenType,
} from 'generated/prisma/client';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { randomBytes } from 'node:crypto';

import {
  LOCKOUT_DURATION_MINUTES,
  MAX_FAILED_ATTEMPTS,
  PASSWORD_HASHING_OPTIONS,
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
  SESSION_LIST_DEFAULT_PAGE_SIZE,
  SESSION_LIST_MAX_PAGE_SIZE,
} from './auth.constants';
import { MfaService } from './mfa/mfa.service';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { SendChallengeDto } from './dto/send-challenge.dto';
import { TotpSetupResponseDto } from './dto/totp-setup.response';
import { BackupCodesResponseDto } from './dto/backup-codes.response';
import {
  AdminEnforceTwoFactorDto,
  EnforceTwoFactorDto,
} from './dto/enforce-two-factor.dto';
import { UsersService, UserWithPreferences } from '../users/users.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { UserPreferenceDto } from './dto/user-preference.dto';
import { EmailService } from '@/common/services/email-service/email.service';
import { TenantsService } from '../tenants/tenants.service';
import { TenantCreationDto, tenantUpdateDto } from '../tenants/dto';

export interface SessionStateSnapshot {
  readonly id: string;
  readonly requiresTwoFactor: boolean;
  readonly twoFactorVerified: boolean;
}

export interface SessionUser extends SessionStateSnapshot {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber?: string | null;
  readonly emailVerified: Date | null;
  readonly onboardingStatus: OnboardingStatus;
  readonly onboardingCompletedAt?: Date | null;
  readonly isActive: boolean;
  readonly needsOnboarding: boolean;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date | null;
  readonly lastActiveAt?: Date | null;
  readonly twoFactorEnabled: boolean;
  readonly twoFactorType?: TwoFactorType | null;
  readonly twoFactorEnforced: boolean;
  readonly profileComplete: boolean;
  readonly tenantCreation: boolean;
  readonly tenantSetting: boolean;
}

export type AuthenticatedResponse = RegisterResponseDto;

type SessionStateOverrides = Partial<
  Pick<SessionStateSnapshot, 'requiresTwoFactor' | 'twoFactorVerified'>
>;

type AuthOperationResult = {
  sessionUser: SessionUser;
  response: AuthenticatedResponse;
};

type SessionMetadata = {
  deviceName: string | null;
  osName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
  lastLoginAt: string | null;
};

const sessionUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  emailVerified: true,
  onboardingStatus: true,
  onboardingCompletedAt: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
  lastActiveAt: true,
  twoFactorEnabled: true,
  twoFactorType: true,
  twoFactorEnforced: true,
} as const;

type SessionUserRecord = Prisma.UserGetPayload<{
  select: typeof sessionUserSelect;
}>;

export type SessionSummary = SessionMetadata & {
  sessionId: string;
  expiresAt: string | null;
  idleSecondsRemaining: number | null;
  requiresTwoFactor: boolean;
  twoFactorVerified: boolean;
  isCurrent: boolean;
};

export type SessionListResult = {
  items: SessionSummary[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionPrefix = 'auth:';
  private readonly defaultSessionTtlSeconds = 60 * 60 * 24 * 7;
  private readonly metadataTtlBufferSeconds = 60 * 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mfaService: MfaService,
    private readonly emailService: EmailService,
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthOperationResult> {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'An account already exists with the provided email address.',
      );
    }

    const passwordHash = await this.hashPassword(dto.password);
    const phoneNumber =
      dto.phoneNumber && dto.phoneNumber.trim().length > 0
        ? dto.phoneNumber.trim()
        : null;
    const user = await this.usersService.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      password: passwordHash,
      phoneNumber,
      passwordChangedAt: new Date(),
      preferences: {
        create: {},
      },
      passwordHistory: {
        create: {
          password: passwordHash,
        },
      },
      onboardingState: {
        create: {
          profileComplete: false,
          tenantCreation: false,
          tenantSetting: false,
        },
      },
    });

    this.logger.log(`Registered new user with id ${user.id}`);

    const { token: emailVerificationToken } =
      await this.createVerificationToken(
        user.id,
        VerificationTokenType.EMAIL_VERIFICATION,
        EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
      );

    void this.emailService.sendWelcomeEmail(
      user.email,
      user.firstName + ' ' + user.lastName,
    );

    if (this.shouldLogSensitiveValues()) {
      this.logger.debug(
        `Email verification token for user ${user.id}: ${emailVerificationToken}`,
      );
    }

    return this.buildAuthResult(user);
  }

  async validateUser(
    email: string,
    password: string,
    request: Request,
  ): Promise<SessionUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Account is temporarily locked due to multiple failed login attempts.',
      );
    }

    const isPasswordValid = await verify(user.password, password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        lastActiveAt: now,
        lastLoginIp: request.ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    user.lastLoginAt = now;
    user.lastActiveAt = now;
    user.lastLoginIp = request.ip ?? null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    const { require, trustedDevice } = this.mfaService.shouldRequireTwoFactor(
      user,
      request,
    );

    if (!require && trustedDevice) {
      await this.mfaService.updateTrustedDeviceUsage(trustedDevice, request);
    }

    const overrides: SessionStateOverrides = {
      requiresTwoFactor: require,
      twoFactorVerified: !require,
    };

    return this.buildAuthResult(user, overrides).sessionUser;
  }

  async deserializeUser(
    userId: string,
    snapshot?: SessionStateSnapshot,
  ): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: sessionUserSelect,
    });
    // console.log('Deserialized user:', userId, user);
    if (!user) {
      return null;
    }

    const overrides: SessionStateOverrides | undefined = snapshot
      ? {
          requiresTwoFactor: snapshot.requiresTwoFactor,
          twoFactorVerified: snapshot.twoFactorVerified,
        }
      : undefined;

    return this.buildSessionUser(user, overrides);
  }

  async completeUserPreference(userId: string, dto: UserPreferenceDto) {
    // : Promise<AuthenticatedResponse>
    const data: Prisma.UserUpdateInput = {};

    // Prepare preferences data
    const preferencesData: Record<string, any> = {};

    // Only add fields that were provided
    if (dto.timezone !== undefined) {
      preferencesData.timezone = dto.timezone;
    }
    if (dto.language !== undefined) {
      preferencesData.language = dto.language;
    }
    if (dto.theme !== undefined) {
      preferencesData.theme = dto.theme;
    }
    if (dto.emailNotifications !== undefined) {
      preferencesData.emailNotifications = dto.emailNotifications;
    }
    if (dto.smsNotifications !== undefined) {
      preferencesData.smsNotifications = dto.smsNotifications;
    }
    if (dto.pushNotifications !== undefined) {
      preferencesData.pushNotifications = dto.pushNotifications;
    }
    if (dto.weeklyReportEmails !== undefined) {
      preferencesData.weeklyReportEmails = dto.weeklyReportEmails;
    }
    if (dto.pxlhutEmails !== undefined) {
      preferencesData.pxlhutEmails = dto.pxlhutEmails;
    }
    if (dto.settings !== undefined) {
      preferencesData.settings = dto.settings;
    }

    data.preferences = {
      upsert: {
        create: preferencesData,
        update: preferencesData,
      },
    };

    // Update onboarding state
    data.onboardingState = {
      upsert: {
        create: { profileComplete: true },
        update: { profileComplete: true },
      },
    };

    const updatedUser = await this.usersService.update(userId, data);
    return this.buildAuthResult(updatedUser).response;
  }

  async createTenantOnboarding(userId: string, dto: TenantCreationDto) {
    return await this.tenantsService.createTenant(userId, dto);
  }

  async updateTenantSettings(
    userId: string,
    dto: tenantUpdateDto,
    tenantId: string,
  ) {
    return await this.tenantsService.updateTenant(userId, dto, tenantId);
  }

  async getAuthenticatedUser(
    userId: string,
    snapshot?: SessionStateSnapshot,
  ): Promise<AuthenticatedResponse> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const overrides: SessionStateOverrides | undefined = snapshot
      ? {
          requiresTwoFactor: snapshot.requiresTwoFactor,
          twoFactorVerified: snapshot.twoFactorVerified,
        }
      : undefined;

    return this.buildAuthResult(user, overrides).response;
  }

  async getAuthenticatedUserFromSession(
    snapshot: SessionStateSnapshot,
  ): Promise<AuthenticatedResponse> {
    return this.getAuthenticatedUser(snapshot.id, snapshot);
  }

  async listActiveSessions(
    userId: string,
    currentSessionId?: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<SessionListResult> {
    const client = this.redisService.getClient();
    const indexKey = this.buildUserSessionIndexKey(userId);
    const summaries: SessionSummary[] = [];
    const cleanupTasks: Array<Promise<void>> = [];
    const rawPage = options?.page;
    const rawPageSize = options?.pageSize;
    const requestedPage =
      typeof rawPage === 'number' && Number.isFinite(rawPage)
        ? Math.floor(rawPage)
        : 1;
    const requestedPageSize =
      typeof rawPageSize === 'number' && Number.isFinite(rawPageSize)
        ? Math.floor(rawPageSize)
        : SESSION_LIST_DEFAULT_PAGE_SIZE;
    const page = requestedPage > 0 ? requestedPage : 1;
    const pageSize = Math.min(
      SESSION_LIST_MAX_PAGE_SIZE,
      requestedPageSize > 0
        ? requestedPageSize
        : SESSION_LIST_DEFAULT_PAGE_SIZE,
    );

    try {
      const sessionIds = await client.sMembers(indexKey);
      if (sessionIds.length > 0) {
        const lookups = await Promise.all(
          sessionIds.map(async (sessionId) => {
            const [rawMetadata, ttl] = await Promise.all([
              client.hGetAll(this.buildSessionMetadataKey(sessionId)),
              client.ttl(this.buildSessionKey(sessionId)),
            ]);
            return { sessionId, rawMetadata, ttl };
          }),
        );

        for (const { sessionId, rawMetadata, ttl } of lookups) {
          if (ttl === -2 || ttl === 0) {
            cleanupTasks.push(this.cleanupSessionArtifacts(sessionId, userId));
            continue;
          }

          const hasMetadata = Object.keys(rawMetadata).length > 0;
          if (!hasMetadata) {
            cleanupTasks.push(this.cleanupSessionArtifacts(sessionId, userId));
            continue;
          }

          const cached = this.deserializeCachedMetadata(rawMetadata);
          if (!cached.userId || cached.userId !== userId) {
            cleanupTasks.push(this.cleanupSessionArtifacts(sessionId, userId));
            continue;
          }

          const idleSecondsRemaining = ttl > 0 ? ttl : null;
          const expiresAt =
            ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null;

          summaries.push({
            sessionId,
            expiresAt,
            idleSecondsRemaining,
            requiresTwoFactor: cached.requiresTwoFactor,
            twoFactorVerified: cached.twoFactorVerified,
            isCurrent: sessionId === currentSessionId,
            deviceName: cached.metadata.deviceName,
            osName: cached.metadata.osName,
            userAgent: cached.metadata.userAgent,
            ipAddress: cached.metadata.ipAddress,
            location: cached.metadata.location,
            lastLoginAt: cached.metadata.lastLoginAt,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to enumerate sessions for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException('Unable to load session list.');
    }

    if (cleanupTasks.length > 0) {
      await Promise.allSettled(cleanupTasks);
    }

    const toTimestamp = (value: string | null): number => {
      if (!value) {
        return 0;
      }

      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const sortedSummaries = summaries.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) {
        return a.isCurrent ? -1 : 1;
      }

      const bLogin = toTimestamp(b.lastLoginAt);
      const aLogin = toTimestamp(a.lastLoginAt);
      if (bLogin !== aLogin) {
        return bLogin - aLogin;
      }

      const bExpires = toTimestamp(b.expiresAt);
      const aExpires = toTimestamp(a.expiresAt);
      if (bExpires !== aExpires) {
        return bExpires - aExpires;
      }

      return a.sessionId.localeCompare(b.sessionId);
    });
    const totalItems = sortedSummaries.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    const effectivePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const startIndex = (effectivePage - 1) * pageSize;
    const paginatedItems =
      totalItems === 0
        ? []
        : sortedSummaries.slice(startIndex, startIndex + pageSize);
    return {
      items: paginatedItems,
      totalItems,
      page: effectivePage,
      pageSize,
      totalPages,
      hasNextPage: totalPages > 0 && effectivePage < totalPages,
      hasPreviousPage: totalPages > 0 && effectivePage > 1,
    };
  }

  async ensureSessionMetadata(
    request: Request,
    sessionUser: SessionUser,
    deviceLabel?: string | null,
  ): Promise<void> {
    await this.updateSessionMetadata(request, sessionUser, deviceLabel ?? null);
  }

  async touchSessionCache(request: Request): Promise<void> {
    const sessionId = this.extractSessionId(request);
    if (!sessionId) {
      return;
    }
    const ttlSeconds = this.resolveSessionTtlSeconds(request);
    const userId = (request.user as Partial<SessionStateSnapshot> | undefined)
      ?.id;
    await this.refreshSessionCacheTtl(sessionId, userId, ttlSeconds);
  }

  async removeSessionArtifacts(
    sessionId: string,
    options?: { userId?: string },
  ): Promise<void> {
    await this.cleanupSessionArtifacts(sessionId, options?.userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (
      !record ||
      record.type !== VerificationTokenType.EMAIL_VERIFICATION ||
      record.used ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: new Date(),
        },
      });

      await tx.verificationToken.update({
        where: { id: record.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });
    });
  }

  async resendEmailVerification(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.emailVerified) {
      return;
    }

    const { token } = await this.createVerificationToken(
      user.id,
      VerificationTokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
    );

    void this.emailService.sendEmailVerification(
      user.email,
      `${user.firstName} ${user.lastName}`,
      token,
    );

    if (this.shouldLogSensitiveValues()) {
      this.logger.debug(
        `Resent email verification token for user ${user.id}: ${token}`,
      );
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || !user.isActive) {
      return;
    }

    const { token } = await this.createVerificationToken(
      user.id,
      VerificationTokenType.PASSWORD_RESET,
      PASSWORD_RESET_TOKEN_TTL_MINUTES,
    );

    void this.emailService.sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      token,
    );

    if (this.shouldLogSensitiveValues()) {
      this.logger.debug(`Password reset token for user ${user.id}: ${token}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (
      !record ||
      record.type !== VerificationTokenType.PASSWORD_RESET ||
      record.used ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const passwordHash = await this.hashPassword(newPassword);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          passwordChangedAt: now,
          sessionVersion: {
            increment: 1,
          },
        },
      });

      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          password: passwordHash,
        },
      });

      await tx.verificationToken.update({
        where: { id: record.id },
        data: {
          used: true,
          usedAt: now,
        },
      });
    });

    await this.revokeAllSessions(user.id);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const client = this.redisService.getClient();
    const indexKey = this.buildUserSessionIndexKey(userId);
    const isMember = await client.sIsMember(indexKey, sessionId);
    if (!isMember) {
      await this.cleanupSessionArtifacts(sessionId, userId);
      throw new NotFoundException('Session not found.');
    }

    const deleted = await client.del(this.buildSessionKey(sessionId));
    await this.cleanupSessionArtifacts(sessionId, userId);

    if (deleted === 0) {
      throw new NotFoundException('Session not found.');
    }
  }

  async revokeAllSessions(
    userId: string,
    options?: { keepSessionId?: string },
  ): Promise<void> {
    const client = this.redisService.getClient();
    const indexKey = this.buildUserSessionIndexKey(userId);
    const sessionIds = await client.sMembers(indexKey);
    if (sessionIds.length === 0) {
      return;
    }

    const keepSessionId = options?.keepSessionId;
    const targets =
      keepSessionId !== undefined
        ? sessionIds.filter((sessionId) => sessionId !== keepSessionId)
        : sessionIds;

    if (targets.length === 0) {
      return;
    }

    await Promise.allSettled(
      targets.map((sessionId) => client.del(this.buildSessionKey(sessionId))),
    );
    await Promise.allSettled(
      targets.map((sessionId) =>
        this.cleanupSessionArtifacts(sessionId, userId),
      ),
    );
  }

  async initiateTotpSetup(userId: string): Promise<TotpSetupResponseDto> {
    const user = await this.loadUserOrThrow(userId);
    return this.mfaService.initiateTotpSetup(user);
  }

  async enableTwoFactor(
    userId: string,
    dto: EnableTwoFactorDto,
    request: Request,
    response: Response,
  ): Promise<AuthOperationResult> {
    const user = await this.loadUserOrThrow(userId);
    let updatedUser: UserWithPreferences;

    switch (dto.method) {
      case TwoFactorType.TOTP: {
        updatedUser = await this.mfaService.enableTotp(user, dto.code);
        break;
      }
      case TwoFactorType.EMAIL: {
        const channel = this.twoFactorTypeToChannel(dto.method);
        if (
          (channel as string) === MfaChallengeChannel.SMS &&
          !user.phoneNumber
        ) {
          throw new BadRequestException(
            'SMS two-factor requires a phone number on file.',
          );
        }

        const verified = await this.mfaService.verifyOutOfBandChallenge(
          user.id,
          dto.method,
          dto.code,
        );

        if (!verified) {
          throw new UnauthorizedException(
            'Invalid or expired verification code.',
          );
        }

        updatedUser = await this.usersService.update(user.id, {
          twoFactorEnabled: true,
          twoFactorType: dto.method,
          twoFactorSecret: null,
          twoFactorTempSecret: null,
          twoFactorVerifiedAt: new Date(),
        });
        break;
      }
      default: {
        throw new BadRequestException(
          'Unsupported two-factor method: ' + String(dto.method),
        );
      }
    }

    if (dto.rememberDevice) {
      await this.mfaService.rememberDevice(
        updatedUser.id,
        request,
        response,
        dto.deviceLabel,
      );
    }

    const overrides: SessionStateOverrides = {
      requiresTwoFactor: false,
      twoFactorVerified: true,
    };

    return this.buildAuthResult(updatedUser, overrides);
  }

  async disableTwoFactor(
    userId: string,
    dto: DisableTwoFactorDto,
  ): Promise<AuthOperationResult> {
    const user = await this.loadUserOrThrow(userId);

    if (!dto.adminOverride) {
      const verified = await this.verifyDisableRequest(user, dto);

      if (!verified) {
        throw new UnauthorizedException(
          'Invalid or expired verification code.',
        );
      }
    }

    await this.mfaService.disableTwoFactor(user.id);
    const updatedUser = await this.loadUserOrThrow(user.id);

    const overrides: SessionStateOverrides = {
      requiresTwoFactor: false,
      twoFactorVerified: true,
    };

    return this.buildAuthResult(updatedUser, overrides);
  }

  async verifyTwoFactor(
    userId: string,
    dto: VerifyTwoFactorDto,
    request: Request,
    response: Response,
  ): Promise<AuthOperationResult> {
    const user = await this.loadUserOrThrow(userId);

    const verified = await this.verifyChallenge(user, dto);

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired verification code.');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: now,
        twoFactorVerifiedAt: now,
      },
    });

    const refreshedUser = await this.loadUserOrThrow(user.id);

    if (dto.rememberDevice) {
      await this.mfaService.rememberDevice(
        refreshedUser.id,
        request,
        response,
        dto.deviceLabel,
      );
    }

    const overrides: SessionStateOverrides = {
      requiresTwoFactor: false,
      twoFactorVerified: true,
    };

    return this.buildAuthResult(refreshedUser, overrides);
  }

  async sendTwoFactorChallenge(
    userId: string,
    dto: SendChallengeDto,
  ): Promise<void> {
    const user = await this.loadUserOrThrow(userId);

    if ((dto.channel as string) === 'SMS' && !user.phoneNumber) {
      throw new BadRequestException(
        'SMS two-factor requires a phone number on file.',
      );
    }

    this.mfaService.assertChannelSupported(dto.channel);
    await this.mfaService.createOutOfBandChallenge(
      user.id,
      dto.channel,
      user.email,
    );
  }

  async generateBackupCodes(userId: string): Promise<BackupCodesResponseDto> {
    const user = await this.loadUserOrThrow(userId);

    if (!user.twoFactorEnabled) {
      throw new BadRequestException(
        'Enable two-factor authentication before generating backup codes.',
      );
    }

    const codes = await this.mfaService.generateBackupCodes(user.id);
    return new BackupCodesResponseDto(codes);
  }

  async enforceTwoFactorForCurrentUser(
    userId: string,
    dto: EnforceTwoFactorDto,
  ): Promise<AuthOperationResult> {
    const updatedUser = await this.usersService.update(userId, {
      twoFactorEnforced: dto.enforced,
      twoFactorEnforcedAt: dto.enforced ? new Date() : null,
    });

    const overrides: SessionStateOverrides = dto.enforced
      ? {
          requiresTwoFactor: !updatedUser.twoFactorEnabled,
          twoFactorVerified: updatedUser.twoFactorEnabled,
        }
      : {
          requiresTwoFactor: false,
          twoFactorVerified: true,
        };

    return this.buildAuthResult(updatedUser, overrides);
  }

  async adminEnforceTwoFactor(
    dto: AdminEnforceTwoFactorDto,
  ): Promise<AuthenticatedResponse> {
    // TODO: Restrict this endpoint to administrative roles.
    const updatedUser = await this.usersService.update(dto.userId, {
      twoFactorEnforced: dto.enforced,
      twoFactorEnforcedAt: dto.enforced ? new Date() : null,
    });

    return this.buildAuthResult(updatedUser).response;
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password, PASSWORD_HASHING_OPTIONS);
  }

  private async handleFailedLogin(
    userId: string,
    currentFailedAttempts: number,
  ): Promise<void> {
    const nextFailedAttempts = currentFailedAttempts + 1;

    const data: Prisma.UserUpdateInput = {
      failedLoginAttempts: {
        increment: 1,
      },
    };

    if (nextFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      data.lockedUntil = lockUntil;
    }

    await this.usersService.update(userId, data);
  }

  private async loadUserOrThrow(userId: string): Promise<UserWithPreferences> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return user;
  }

  private twoFactorTypeToChannel(method: TwoFactorType): MfaChallengeChannel {
    switch (method) {
      case TwoFactorType.SMS:
        return MfaChallengeChannel.SMS;
      case TwoFactorType.EMAIL:
        return MfaChallengeChannel.EMAIL;
      default:
        throw new BadRequestException(
          `Two-factor method ${method} does not map to a challenge channel.`,
        );
    }
  }

  private async verifyDisableRequest(
    user: UserWithPreferences,
    dto: DisableTwoFactorDto,
  ): Promise<boolean> {
    switch (dto.channel) {
      case 'TOTP': {
        if (!dto.code) {
          throw new BadRequestException('Verification code is required.');
        }
        return this.mfaService.verifyTotp(user, dto.code);
      }
      case 'EMAIL': {
        if (!dto.code) {
          throw new BadRequestException('Verification code is required.');
        }
        return this.mfaService.verifyOutOfBandChallenge(
          user.id,
          dto.channel,
          dto.code,
        );
      }
      case 'BACKUP_CODE': {
        if (!dto.backupCode) {
          throw new BadRequestException('Backup code is required.');
        }
        return this.mfaService.validateBackupCode(user, dto.backupCode);
      }
      default: {
        throw new BadRequestException(
          'Unsupported channel for disabling two-factor: ' +
            String(dto.channel),
        );
      }
    }
  }

  private async verifyChallenge(
    user: UserWithPreferences,
    dto: VerifyTwoFactorDto,
  ): Promise<boolean> {
    switch (dto.channel) {
      case 'TOTP':
        return this.mfaService.verifyTotp(user, dto.code);
      case 'EMAIL':
        return this.mfaService.verifyOutOfBandChallenge(
          user.id,
          dto.channel,
          dto.code,
        );
      case 'BACKUP_CODE':
        return this.mfaService.validateBackupCode(user, dto.code);
      default:
        throw new BadRequestException(
          'Unsupported verification channel: ' + String(dto.channel),
        );
    }
  }

  private buildSessionMetadataKey(sessionId: string): string {
    return `${this.sessionPrefix}metadata:${sessionId}`;
  }

  private buildUserSessionIndexKey(userId: string): string {
    return `${this.sessionPrefix}user:${userId}`;
  }

  private extractSessionId(request: Request): string | undefined {
    if (typeof request.sessionID === 'string' && request.sessionID.length > 0) {
      return request.sessionID;
    }

    const session = request.session as { id?: string } | undefined;
    if (session && typeof session.id === 'string' && session.id.length > 0) {
      return session.id;
    }

    return undefined;
  }

  private resolveSessionTtlSeconds(request: Request): number {
    const maxAgeMs =
      request.session?.cookie?.maxAge ??
      (request.session?.cookie as { originalMaxAge?: number } | undefined)
        ?.originalMaxAge ??
      0;
    if (typeof maxAgeMs === 'number' && maxAgeMs > 0) {
      return Math.ceil(maxAgeMs / 1000);
    }
    return this.defaultSessionTtlSeconds;
  }

  private hasMetadataChanged(
    previous: SessionMetadata,
    updated: SessionMetadata,
  ): boolean {
    return (
      previous.deviceName !== updated.deviceName ||
      previous.osName !== updated.osName ||
      previous.userAgent !== updated.userAgent ||
      previous.ipAddress !== updated.ipAddress ||
      previous.location !== updated.location ||
      previous.lastLoginAt !== updated.lastLoginAt
    );
  }

  private serializeMetadataForCache(
    sessionUser: SessionUser,
    metadata: SessionMetadata,
  ): Record<string, string> {
    return {
      userId: sessionUser.id,
      requiresTwoFactor: sessionUser.requiresTwoFactor ? '1' : '0',
      twoFactorVerified: sessionUser.twoFactorVerified ? '1' : '0',
      deviceName: metadata.deviceName ?? '',
      osName: metadata.osName ?? '',
      userAgent: metadata.userAgent ?? '',
      ipAddress: metadata.ipAddress ?? '',
      location: metadata.location ?? '',
      lastLoginAt: metadata.lastLoginAt ?? '',
      updatedAt: new Date().toISOString(),
    };
  }

  private deserializeCachedMetadata(raw: Record<string, string>): {
    userId: string | null;
    metadata: SessionMetadata;
    requiresTwoFactor: boolean;
    twoFactorVerified: boolean;
    lastLoginAt: string | null;
  } {
    const userId = raw.userId ?? null;
    const normalize = (value?: string): string | null =>
      value && value.length > 0 ? value : null;
    const metadata: SessionMetadata = {
      deviceName: normalize(raw.deviceName),
      osName: normalize(raw.osName),
      userAgent: normalize(raw.userAgent),
      ipAddress: normalize(raw.ipAddress),
      location: normalize(raw.location),
      lastLoginAt: normalize(raw.lastLoginAt),
    };
    return {
      userId,
      metadata,
      requiresTwoFactor: raw.requiresTwoFactor === '1',
      twoFactorVerified: raw.twoFactorVerified === '1',
      lastLoginAt: normalize(raw.lastLoginAt),
    };
  }

  private async registerSessionInCache(
    sessionUser: SessionUser,
    sessionId: string,
    metadata: SessionMetadata,
    ttlSeconds: number,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const metadataKey = this.buildSessionMetadataKey(sessionId);
    const indexKey = this.buildUserSessionIndexKey(sessionUser.id);
    const payload = this.serializeMetadataForCache(sessionUser, metadata);
    const expireSeconds = Math.max(
      ttlSeconds + this.metadataTtlBufferSeconds,
      0,
    );

    const tasks: Array<Promise<unknown>> = [
      client.hSet(metadataKey, payload),
      client.sAdd(indexKey, sessionId),
    ];
    if (expireSeconds > 0) {
      tasks.push(client.expire(metadataKey, expireSeconds));
      tasks.push(client.expire(indexKey, expireSeconds));
    }
    await Promise.allSettled(tasks);
  }

  private async refreshSessionCacheTtl(
    sessionId: string,
    userId: string | undefined,
    ttlSeconds: number,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const metadataKey = this.buildSessionMetadataKey(sessionId);
    const tasks: Array<Promise<unknown>> = [
      client.expire(
        metadataKey,
        Math.max(ttlSeconds + this.metadataTtlBufferSeconds, 1),
      ),
    ];
    if (userId) {
      tasks.push(
        client.expire(
          this.buildUserSessionIndexKey(userId),
          Math.max(ttlSeconds + this.metadataTtlBufferSeconds, 1),
        ),
      );
    }
    await Promise.allSettled(tasks);
  }

  private async cleanupSessionArtifacts(
    sessionId: string,
    userId?: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const tasks: Array<Promise<unknown>> = [
      client.del(this.buildSessionMetadataKey(sessionId)),
    ];
    if (userId) {
      tasks.push(client.sRem(this.buildUserSessionIndexKey(userId), sessionId));
    }
    await Promise.allSettled(tasks);
  }

  private async updateSessionMetadata(
    request: Request,
    sessionUser: SessionUser,
    deviceLabel: string | null,
  ): Promise<void> {
    const sessionId = this.extractSessionId(request);
    if (!sessionId) {
      return;
    }
    const ttlSeconds = this.resolveSessionTtlSeconds(request);
    const session = request.session as unknown as
      | (Record<string, unknown> & { metadata?: SessionMetadata })
      | undefined;

    if (!session) {
      await this.registerSessionInCache(
        sessionUser,
        sessionId,
        this.normalizeMetadata(undefined),
        ttlSeconds,
      );
      return;
    }

    const previous = this.normalizeMetadata(session.metadata);
    const updated = this.deriveSessionMetadata(
      request,
      sessionUser,
      deviceLabel,
      previous,
    );

    session.metadata = updated;

    if (this.hasMetadataChanged(previous, updated)) {
      try {
        await this.commitSession(request);
      } catch (error) {
        this.logger.warn(
          `Failed to persist session metadata: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.registerSessionInCache(
      sessionUser,
      sessionId,
      updated,
      ttlSeconds,
    );
  }

  private deriveSessionMetadata(
    request: Request,
    sessionUser: SessionUser,
    deviceLabel: string | null,
    previous: SessionMetadata,
  ): SessionMetadata {
    const rawUserAgent = request.get('user-agent') ?? previous.userAgent;
    const userAgent =
      rawUserAgent && rawUserAgent.length > 0
        ? rawUserAgent
        : previous.userAgent;
    const osName = this.detectOsName(userAgent) ?? previous.osName;
    const deviceName =
      this.detectDeviceName(userAgent, deviceLabel) ?? previous.deviceName;
    const ipAddress = this.normalizeIpAddress(request.ip) ?? previous.ipAddress;
    const lastLoginAt = this.toIsoString(sessionUser.lastLoginAt ?? new Date());
    return {
      deviceName,
      osName,
      userAgent: userAgent ?? null,
      ipAddress,
      // TODO: Integrate IP geolocation provider to populate location information.
      location: previous.location,
      lastLoginAt,
    };
  }

  private normalizeMetadata(metadata?: SessionMetadata): SessionMetadata {
    return {
      deviceName: metadata?.deviceName ?? null,
      osName: metadata?.osName ?? null,
      userAgent: metadata?.userAgent ?? null,
      ipAddress: metadata?.ipAddress ?? null,
      location: metadata?.location ?? null,
      lastLoginAt: metadata?.lastLoginAt ?? null,
    };
  }

  private detectDeviceName(
    userAgent: string | null,
    providedLabel: string | null,
  ): string | null {
    if (providedLabel && providedLabel.trim().length > 0) {
      return providedLabel.trim().slice(0, 100);
    }

    if (!userAgent) {
      return null;
    }

    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone')) {
      return 'iPhone';
    }
    if (ua.includes('ipad')) {
      return 'iPad';
    }
    if (ua.includes('android')) {
      return 'Android Device';
    }
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      return 'Mac';
    }
    if (ua.includes('windows')) {
      return 'Windows PC';
    }
    if (ua.includes('linux')) {
      return 'Linux Device';
    }
    return null;
  }

  private detectOsName(userAgent: string | null): string | null {
    if (!userAgent) {
      return null;
    }

    const ua = userAgent.toLowerCase();
    if (ua.includes('windows nt')) {
      return 'Windows';
    }
    if (ua.includes('mac os x')) {
      return 'macOS';
    }
    if (ua.includes('iphone') || ua.includes('ios')) {
      return 'iOS';
    }
    if (ua.includes('android')) {
      return 'Android';
    }
    if (ua.includes('ipad')) {
      return 'iPadOS';
    }
    if (ua.includes('linux')) {
      return 'Linux';
    }
    if (ua.includes('chrome os')) {
      return 'ChromeOS';
    }
    return null;
  }

  private normalizeIpAddress(ip: string | undefined): string | null {
    if (!ip || ip.length === 0) {
      return null;
    }

    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  }

  private async commitSession(request: Request): Promise<void> {
    if (typeof request.session?.save !== 'function') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      request.session.save((error) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }

  private toIsoString(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString();
  }

  private buildSessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`;
  }

  private async createVerificationToken(
    userId: string,
    type: VerificationTokenType,
    ttlMinutes: number,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.verificationToken.updateMany({
        where: {
          userId,
          type,
          used: false,
        },
        data: {
          used: true,
          usedAt: now,
        },
      });

      await tx.verificationToken.create({
        data: {
          userId,
          token,
          type,
          expiresAt,
        },
      });
    });

    return { token, expiresAt };
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private shouldLogSensitiveValues(): boolean {
    return this.configService.get('app.nodeEnv') !== 'production';
  }

  private buildAuthResult(
    user: UserWithPreferences | SessionUserRecord,
    overrides?: SessionStateOverrides,
  ): AuthOperationResult {
    const sessionUser = this.buildSessionUser(user, overrides);
    const response = this.buildAuthResponse(user, sessionUser);
    return { sessionUser, response };
  }

  private buildAuthResponse(
    user: UserWithPreferences | SessionUserRecord,
    sessionState?: SessionStateSnapshot,
  ): AuthenticatedResponse {
    const requiresTwoFactor = sessionState?.requiresTwoFactor ?? false;
    const twoFactorVerified =
      sessionState?.twoFactorVerified ?? !requiresTwoFactor;

    // Extract onboarding state fields (only available on UserWithPreferences)
    const onboardingState =
      'onboardingState' in user ? user.onboardingState : null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? null,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified ?? null,
      onboardingStatus: user.onboardingStatus,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      needsOnboarding: user.onboardingStatus !== OnboardingStatus.COMPLETED,
      lastLoginAt: user.lastLoginAt ?? null,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorType: user.twoFactorType ?? null,
      requiresTwoFactor,
      twoFactorVerified,
      profileComplete: onboardingState?.profileComplete ?? false,
      tenantCreation: onboardingState?.tenantCreation ?? false,
      tenantSetting: onboardingState?.tenantSetting ?? false,
    };
  }

  private buildSessionUser(
    user: UserWithPreferences | SessionUserRecord,
    overrides?: SessionStateOverrides,
  ): SessionUser {
    const requiresTwoFactor = overrides?.requiresTwoFactor ?? false;
    const twoFactorVerified =
      overrides?.twoFactorVerified ?? !requiresTwoFactor;

    // Extract onboarding state fields (only available on UserWithPreferences)
    const onboardingState =
      'onboardingState' in user ? user.onboardingState : null;

    return {
      id: user.id,
      requiresTwoFactor,
      twoFactorVerified,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified ?? null,
      onboardingStatus: user.onboardingStatus,
      onboardingCompletedAt: user.onboardingCompletedAt,
      isActive: user.isActive,
      needsOnboarding: user.onboardingStatus !== OnboardingStatus.COMPLETED,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorType: user.twoFactorType,
      twoFactorEnforced: user.twoFactorEnforced,
      profileComplete: onboardingState?.profileComplete ?? false,
      tenantCreation: onboardingState?.tenantCreation ?? false,
      tenantSetting: onboardingState?.tenantSetting ?? false,
    };
  }
}
