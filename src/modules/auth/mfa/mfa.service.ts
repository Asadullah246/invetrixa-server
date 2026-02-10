import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { authenticator } from 'otplib';
import { randomBytes, createHash } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from 'argon2';
import {
  TrustedDevice,
  TrustedDeviceStatus,
  TwoFactorType,
} from 'generated/prisma/client';

import {
  MFA_BACKUP_CODE_LENGTH,
  MFA_BACKUP_CODES_COUNT,
  MFA_MAX_ATTEMPTS,
  MFA_OOB_CODE_LENGTH,
  MFA_OOB_CODE_TTL_MINUTES,
  MFA_REMEMBER_DEVICE_COOKIE,
  MFA_REMEMBER_DEVICE_DAYS,
  PASSWORD_HASHING_OPTIONS,
} from '../auth.constants';
import { SupportedTwoFactorChannels } from '../dto/verify-two-factor.dto';
import { OutOfBandChannel } from '../dto/send-challenge.dto';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  UsersService,
  UserWithPreferences,
} from '@/modules/users/users.service';
import { EmailService } from '@/common/services/email-service/email.service';

type RequireTwoFactorResult = {
  require: boolean;
  trustedDevice?: TrustedDevice;
};

const BACKUP_CODE_SEPARATOR = '-';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly issuer: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    authenticator.options = {
      digits: 6,
      step: 30,
      window: 1,
    };
    this.issuer = configService.get<string>('APP_NAME') ?? 'INVETRIXA';
  }

  async initiateTotpSetup(
    user: UserWithPreferences,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempSecret: secret,
        twoFactorType: TwoFactorType.TOTP,
      },
    });

    const otpauthUrl = authenticator.keyuri(user.email, this.issuer, secret);

    return { secret, otpauthUrl };
  }

  async enableTotp(
    user: UserWithPreferences,
    code: string,
  ): Promise<UserWithPreferences> {
    const secret =
      user.twoFactorTempSecret ?? user.twoFactorSecret ?? undefined;

    if (!secret) {
      throw new BadRequestException(
        'No TOTP secret generated. Please initiate setup first.',
      );
    }

    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code provided.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorTempSecret: null,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
        twoFactorType: TwoFactorType.TOTP,
      },
    });

    const updated = await this.usersService.findById(user.id);
    if (!updated) {
      throw new NotFoundException('Failed to load user after enabling 2FA.');
    }

    return updated;
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorTempSecret: null,
          twoFactorType: null,
          twoFactorEnforced: false,
          twoFactorEnforcedAt: null,
          twoFactorVerifiedAt: null,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({
        where: { userId },
      }),
      this.prisma.trustedDevice.deleteMany({
        where: { userId },
      }),
      this.prisma.twoFactorChallenge.deleteMany({
        where: { userId },
      }),
    ]);
  }

  verifyTotp(user: UserWithPreferences, code: string): boolean {
    const secret = user.twoFactorSecret;
    if (!secret) {
      return false;
    }

    return authenticator.verify({ token: code, secret });
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    const hashes: Promise<{ userId: string; codeHash: string }>[] = [];

    for (let i = 0; i < MFA_BACKUP_CODES_COUNT; i += 1) {
      const code = this.generateBackupCode();
      const hash = argonHash(code, PASSWORD_HASHING_OPTIONS).then(
        (codeHash) => ({
          userId,
          codeHash,
        }),
      );
      codes.push(code);
      hashes.push(hash);
    }

    const prepared = await Promise.all(hashes);
    await this.usersService.replaceBackupCodes(userId, prepared);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodesVersion: {
          increment: 1,
        },
      },
    });

    return codes;
  }

  async validateBackupCode(
    user: UserWithPreferences,
    code: string,
  ): Promise<boolean> {
    const normalized = code.trim();

    for (const backupCode of user.twoFactorBackupCodes) {
      if (backupCode.used) {
        continue;
      }

      const matches = await argonVerify(backupCode.codeHash, normalized);

      if (matches) {
        await this.usersService.markBackupCodeUsed(backupCode.id);
        return true;
      }
    }

    return false;
  }

  shouldRequireTwoFactor(
    user: UserWithPreferences,
    request: Request,
  ): RequireTwoFactorResult {
    if (!user.twoFactorEnabled && !user.twoFactorEnforced) {
      return { require: false };
    }

    const rawCookie: unknown = request.cookies?.[MFA_REMEMBER_DEVICE_COOKIE];
    const deviceToken =
      typeof rawCookie === 'string' && rawCookie.length > 0 ? rawCookie : null;

    if (!deviceToken) {
      return { require: true };
    }

    const deviceHash = this.hashTrustedDeviceToken(deviceToken);
    const trustedDevice = user.trustedDevices.find(
      (device) =>
        device.deviceId === deviceHash &&
        device.status === TrustedDeviceStatus.ACTIVE &&
        device.expiresAt > new Date(),
    );

    if (!trustedDevice) {
      return { require: true };
    }

    // Risk-based: new IP or user agent forces re-prompt.
    const userAgent = request.get('user-agent') ?? undefined;
    if (
      (trustedDevice.ipAddress && trustedDevice.ipAddress !== request.ip) ||
      (trustedDevice.userAgent &&
        userAgent &&
        userAgent !== trustedDevice.userAgent)
    ) {
      return { require: true };
    }

    return { require: false, trustedDevice };
  }

  async rememberDevice(
    userId: string,
    request: Request,
    response: Response,
    label?: string,
  ): Promise<void> {
    const rawToken = this.generateTrustedDeviceToken();
    const tokenHash = this.hashTrustedDeviceToken(rawToken);
    const expiresAt = this.addDays(new Date(), MFA_REMEMBER_DEVICE_DAYS);
    const userAgent = request.get('user-agent') ?? null;

    await this.usersService.createTrustedDevice({
      user: {
        connect: { id: userId },
      },
      deviceId: tokenHash,
      userAgent,
      ipAddress: request.ip,
      label: label ?? null,
      expiresAt,
    });

    response.cookie(MFA_REMEMBER_DEVICE_COOKIE, rawToken, {
      httpOnly: true,
      secure: request.secure ?? false,
      sameSite: 'lax',
      maxAge: MFA_REMEMBER_DEVICE_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  async updateTrustedDeviceUsage(
    device: TrustedDevice,
    request: Request,
  ): Promise<void> {
    await this.usersService.updateTrustedDevice(device.deviceId, {
      lastUsedAt: new Date(),
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? device.userAgent,
    });
  }

  async clearRememberedDevices(userId: string): Promise<void> {
    await this.prisma.trustedDevice.updateMany({
      where: { userId, status: TrustedDeviceStatus.ACTIVE },
      data: {
        status: TrustedDeviceStatus.REVOKED,
        expiresAt: new Date(),
      },
    });
  }

  async createOutOfBandChallenge(
    userId: string,
    channel: OutOfBandChannel,
    email: string,
  ): Promise<void> {
    if ((channel as string) === 'SMS') {
      // Temporary disabled SMS
      // throw new BadRequestException('SMS is currently disabled.');
      return;
    }

    const code = this.generateNumericCode(MFA_OOB_CODE_LENGTH);
    const codeHash = await argonHash(code, PASSWORD_HASHING_OPTIONS);
    const expiresAt = this.addMinutes(new Date(), MFA_OOB_CODE_TTL_MINUTES);

    await this.prisma.$transaction(async (tx) => {
      await tx.twoFactorChallenge.updateMany({
        where: {
          userId,
          channel,
          consumed: false,
        },
        data: {
          consumed: true,
          consumedAt: new Date(),
        },
      });

      await tx.twoFactorChallenge.create({
        data: {
          userId,
          channel,
          codeHash,
          expiresAt,
        },
      });
    });

    if (channel === 'EMAIL') {
      // await this.emailService.sendTwoFactorChallengeEmail(email, code);
      if (this.shouldLogSensitiveValues()) {
        this.logger.debug(`Sent email challenge to ${email}: ${code}`);
      }
    }
  }

  private shouldLogSensitiveValues(): boolean {
    return this.configService.get('app.nodeEnv') !== 'production';
  }

  async verifyOutOfBandChallenge(
    userId: string,
    channel: OutOfBandChannel,
    code: string,
  ): Promise<boolean> {
    const activeChallenge =
      await this.usersService.findActiveChallengeByChannel(userId, channel);

    if (!activeChallenge) {
      return false;
    }

    if (activeChallenge.expiresAt < new Date()) {
      await this.usersService.consumeChallenge(activeChallenge.id);
      return false;
    }

    if (activeChallenge.attempts >= MFA_MAX_ATTEMPTS) {
      await this.usersService.consumeChallenge(activeChallenge.id);
      return false;
    }

    const matches = await argonVerify(activeChallenge.codeHash, code);

    if (!matches) {
      await this.usersService.incrementChallengeAttempt(activeChallenge.id);
      return false;
    }

    await this.usersService.consumeChallenge(activeChallenge.id);
    return true;
  }

  assertChannelSupported(channel: string): void {
    if (!SupportedTwoFactorChannels.includes(channel as never)) {
      throw new BadRequestException(
        `Unsupported two-factor verification channel: ${channel}`,
      );
    }
  }

  private generateBackupCode(): string {
    const raw = randomBytes(MFA_BACKUP_CODE_LENGTH)
      .toString('base64url')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, MFA_BACKUP_CODE_LENGTH);

    return raw.match(/.{1,4}/g)?.join(BACKUP_CODE_SEPARATOR) ?? raw;
  }

  private generateTrustedDeviceToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashTrustedDeviceToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateNumericCode(length: number): string {
    const max = 10 ** length;
    const num = Math.floor(Math.random() * max);
    return num.toString().padStart(length, '0');
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private addMinutes(date: Date, minutes: number): Date {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() + minutes);
    return copy;
  }
}
