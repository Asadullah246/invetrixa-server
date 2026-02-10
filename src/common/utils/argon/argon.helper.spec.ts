import { Test, TestingModule } from '@nestjs/testing';
import { ARGON_OPTIONS, ArgonHelper } from './argon.helper';
import { PASSWORD_HASHING_OPTIONS } from '@/common/constants';
import { argon2id } from 'argon2';

describe('ArgonHelper', () => {
  let service: ArgonHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ARGON_OPTIONS,
          useValue: PASSWORD_HASHING_OPTIONS,
        },
        ArgonHelper,
      ],
    }).compile();

    service = module.get<ArgonHelper>(ArgonHelper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).toContain('$argon2id$');
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string password', async () => {
      const password = '';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).toContain('$argon2id$');
    });

    it('should handle unicode characters in password', async () => {
      const password = '密码🔒パスワード';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).toContain('$argon2id$');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password successfully', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(
        wrongPassword,
        hashedPassword,
      );

      expect(isValid).toBe(false);
    });

    it('should reject empty password against valid hash', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword('', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should handle case-sensitive password verification', async () => {
      const password = 'MySecurePassword123';
      const wrongCasePassword = 'mysecurepassword123';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(
        wrongCasePassword,
        hashedPassword,
      );

      expect(isValid).toBe(false);
    });

    it('should verify password with special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should verify password with unicode characters', async () => {
      const password = '密码🔒パスワード';
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject invalid hash format', async () => {
      const password = 'mySecurePassword123';
      const invalidHash = 'not-a-valid-hash';

      await expect(
        service.verifyPassword(password, invalidHash),
      ).rejects.toThrow();
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000);
      const hashedPassword = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });
  });

  describe('dependency injection', () => {
    it('should use injected hashing options', async () => {
      const password = 'testPassword';
      const hashedPassword = await service.hashPassword(password);

      // Verify that the hash uses argon2id (which is in our mock options)
      expect(hashedPassword).toContain('$argon2id$');
    });

    it('should work with custom hashing options', async () => {
      const customOptions = {
        type: argon2id,
        memoryCost: 2 ** 12, // Lower memory cost for testing
        timeCost: 2,
        parallelism: 1,
      };

      const customModule: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: ARGON_OPTIONS,
            useValue: customOptions,
          },
          ArgonHelper,
        ],
      }).compile();

      const customService = customModule.get<ArgonHelper>(ArgonHelper);
      const password = 'testPassword';
      const hashedPassword = await customService.hashPassword(password);
      const isValid = await customService.verifyPassword(
        password,
        hashedPassword,
      );

      expect(hashedPassword).toBeDefined();
      expect(isValid).toBe(true);
    });
  });
});
