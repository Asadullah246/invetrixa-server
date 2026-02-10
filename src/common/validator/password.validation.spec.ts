import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidatePassword } from './password.validation';

// Test DTOs
class RequiredPasswordDto {
  @ValidatePassword({ label: 'Password' })
  password: string;
}

class OptionalPasswordDto {
  @ValidatePassword({ label: 'New Password', optional: true })
  newPassword?: string;
}

class RelaxedPasswordDto {
  @ValidatePassword({
    label: 'Password',
    min: 8,
    strengthOptions: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    },
  })
  password: string;
}

class StrictPasswordDto {
  @ValidatePassword({
    label: 'Admin Password',
    min: 16,
    strengthOptions: {
      minLength: 16,
      minLowercase: 2,
      minUppercase: 2,
      minNumbers: 2,
      minSymbols: 2,
    },
  })
  password: string;
}

class CustomMessagePasswordDto {
  @ValidatePassword({
    label: 'Password',
    messageOptions: {
      emptyMessage: 'Please provide a password',
      strengthMessage: 'Your password must meet security requirements',
      lengthMessage: 'Password length is invalid',
    },
  })
  password: string;
}

class PasswordWithTrimDto {
  @ValidatePassword({ label: 'Password', trimWhitespace: true })
  password: string;
}

describe('ValidatePassword', () => {
  describe('Basic Validation with Default Requirements', () => {
    it('should validate a strong password meeting all default requirements', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'StrongP@ssw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for password without uppercase', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'weakp@ssw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isStrongPassword');
    });

    it('should fail for password without lowercase', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'WEAKP@SSW0RD',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password without numbers', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'WeakP@ssword',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password without symbols', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'WeakPassw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password below minimum length', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'Short1!',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Relaxed Password Requirements', () => {
    it('should validate password meeting relaxed requirements', async () => {
      const dto = plainToInstance(RelaxedPasswordDto, {
        password: 'Password1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept password without symbols when not required', async () => {
      const dto = plainToInstance(RelaxedPasswordDto, {
        password: 'Password123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for password below 8 characters', async () => {
      const dto = plainToInstance(RelaxedPasswordDto, {
        password: 'Pass1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Strict Password Requirements', () => {
    it('should validate password meeting strict requirements', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'VeryStr0ng!!PAssw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for password with only one uppercase', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'verystr0ng!!password',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password with only one lowercase', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'VERYSTR0NG!!PASSWoRD',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password with only one number', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'VeryStrong!!PAssword1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password with only one symbol', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'VeryStr0ng!PAssw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for password below 16 characters', async () => {
      const dto = plainToInstance(StrictPasswordDto, {
        password: 'Str0ng!!PAss',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Whitespace Handling', () => {
    it('should preserve whitespace by default', () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: '  StrongP@ssw0rd  ',
      });
      expect(dto.password).toBe('  StrongP@ssw0rd  ');
    });

    it('should trim whitespace when trimWhitespace is true', () => {
      const dto = plainToInstance(PasswordWithTrimDto, {
        password: '  StrongP@ssw0rd  ',
      });
      expect(dto.password).toBe('StrongP@ssw0rd');
    });

    it('should allow intentional spaces in password', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'Strong P@ssw0rd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalPasswordDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalPasswordDto, {
        newPassword: 'NewStr0ng!Pass',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalPasswordDto, {
        newPassword: 'weak',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default strength message', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: 'weak' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isStrongPassword).toContain('Password');
      expect(errors[0].constraints?.isStrongPassword).toContain('8 characters');
    });

    it('should use custom empty message', async () => {
      const dto = plainToInstance(CustomMessagePasswordDto, {});
      const errors = await validate(dto);
      const emptyError = errors.find((e) => e.constraints?.isNotEmpty);
      expect(emptyError?.constraints?.isNotEmpty).toBe(
        'Please provide a password',
      );
    });

    it('should use custom strength message', async () => {
      const dto = plainToInstance(CustomMessagePasswordDto, {
        password: 'weak',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isStrongPassword).toBe(
        'Your password must meet security requirements',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only string', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: '   ' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle number value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty object', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredPasswordDto, { password: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should ignore unknown properties', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'StrongP@ssw0rd',
        unknownProperty: 'should be ignored',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle very long password', async () => {
      const longPassword = 'VeryLongStr0ng!Password' + 'a'.repeat(100) + 'B1!';
      const dto = plainToInstance(RequiredPasswordDto, {
        password: longPassword,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle unicode characters', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'Str0ng!日本語Pass',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle special symbols', async () => {
      const dto = plainToInstance(RequiredPasswordDto, {
        password: 'Str0ng!@#$%^&*()',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
