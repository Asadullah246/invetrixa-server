/**
 * AuthService Unit Tests
 *
 * Tests for AuthService authentication and session management.
 * Skips 2FA-related methods as per @ApiExcludeEndpoint markers.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { MfaService } from './mfa/mfa.service';
import { EmailService } from '@/common/services/email-service/email.service';
import { TenantsService } from '../tenants/tenants.service';
import { OnboardingStatus } from 'generated/prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Factories
// ─────────────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: null,
  emailVerified: null,
  onboardingStatus: OnboardingStatus.PENDING,
  onboardingCompletedAt: null,
  isActive: true,
  createdAt: new Date(),
  lastLoginAt: null,
  lastActiveAt: null,
  twoFactorEnabled: false,
  twoFactorType: null,
  twoFactorEnforced: false,
  onboardingState: {
    profileComplete: false,
    tenantCreation: false,
    tenantSetting: false,
  },
};

const createRegisterDto = (overrides = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  email: 'test@example.com',
  password: 'SecurePassword123!',
  phoneNumber: undefined,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };
  let mockPrisma: {
    verificationToken: {
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let mockEmailService: {
    sendWelcomeEmail: jest.Mock;
  };

  beforeEach(async () => {
    // Create mocks
    mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockPrisma = {
      verificationToken: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          verificationToken: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ token: 'test-token' }),
          },
        }),
      ),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MfaService, useValue: {} },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TenantsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // register
  // ───────────────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const dto = createRegisterDto();
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.register(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.sessionUser).toBeDefined();
      expect(result.sessionUser.id).toBe('user-123');
      expect(result.sessionUser.email).toBe('test@example.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const dto = createRegisterDto();
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow(
        'An account already exists with the provided email address.',
      );
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dto = createRegisterDto({ email: 'TEST@EXAMPLE.COM' });
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      await service.register(dto);

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should trim whitespace from user input', async () => {
      // Arrange
      const dto = createRegisterDto({
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  test@example.com  ',
      });
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      await service.register(dto);

      // Assert - verify trimmed values were passed to create
      expect(mockUsersService.create).toHaveBeenCalled();
      const createArgs = mockUsersService.create.mock.calls[0][0];
      expect(createArgs.firstName).toBe('John');
      expect(createArgs.lastName).toBe('Doe');
      expect(createArgs.email).toBe('test@example.com');
    });

    it('should send welcome email after registration', async () => {
      // Arrange
      const dto = createRegisterDto();
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      await service.register(dto);

      // Assert
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
      );
    });

    it('should handle optional phone number', async () => {
      // Arrange
      const dto = createRegisterDto({ phoneNumber: '+1234567890' });
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        phoneNumber: '+1234567890',
      });

      // Act
      await service.register(dto);

      // Assert
      const createArgs = mockUsersService.create.mock.calls[0][0];
      expect(createArgs.phoneNumber).toBe('+1234567890');
    });
  });
});
