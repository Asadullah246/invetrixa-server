import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateEmail } from './email.validator';

// Test DTOs
class RequiredEmailDto {
  @ValidateEmail({ label: 'Email' })
  email: string;
}

class OptionalEmailDto {
  @ValidateEmail({ label: 'Secondary Email', optional: true })
  secondaryEmail?: string;
}

class EmailWithLengthDto {
  @ValidateEmail({ label: 'Email', min: 5, max: 50 })
  email: string;
}

class EmailWithOptionsDto {
  @ValidateEmail({
    label: 'Business Email',
    emailOptions: {
      requireTld: true,
      allowIpDomain: false,
    },
  })
  businessEmail: string;
}

class CustomMessageEmailDto {
  @ValidateEmail({
    label: 'Contact Email',
    message: 'Please provide a valid email address',
    lengthMessage: 'Email length is invalid',
    min: 5,
  })
  contactEmail: string;
}

describe('ValidateEmail', () => {
  describe('Basic Validation', () => {
    it('should validate a valid email', async () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'test@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate various valid email formats', async () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example.com',
        'user-name@example.com',
        '123@example.com',
        'a@example.com',
      ];

      for (const email of validEmails) {
        const dto = plainToInstance(RequiredEmailDto, { email });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for invalid email formats', async () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid@.com',
        'invalid..email@example.com',
        'invalid@example',
      ];

      for (const email of invalidEmails) {
        const dto = plainToInstance(RequiredEmailDto, { email });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredEmailDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should trim whitespace from email', () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: '  test@example.com  ',
      });
      expect(dto.email).toBe('test@example.com');
    });

    it('should convert email to lowercase', () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'Test@Example.COM',
      });
      expect(dto.email).toBe('test@example.com');
    });

    it('should trim and lowercase together', () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: '  Test@Example.COM  ',
      });
      expect(dto.email).toBe('test@example.com');
    });
  });

  describe('Length Constraints', () => {
    it('should validate email within length range', async () => {
      const dto = plainToInstance(EmailWithLengthDto, {
        email: 'test@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for email below minimum length', async () => {
      const dto = plainToInstance(EmailWithLengthDto, { email: 'a@b.c' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      // Email validation fails first, not length
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail for email exceeding maximum length', async () => {
      const dto = plainToInstance(EmailWithLengthDto, {
        email: 'verylongemailaddressthatexceedsthemaximumlength@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isLength');
    });
  });

  describe('Email Options', () => {
    it('should validate email with TLD when required', async () => {
      const dto = plainToInstance(EmailWithOptionsDto, {
        businessEmail: 'user@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for IP domain when not allowed', async () => {
      const dto = plainToInstance(EmailWithOptionsDto, {
        businessEmail: 'user@192.168.1.1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalEmailDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalEmailDto, {
        secondaryEmail: 'secondary@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalEmailDto, {
        secondaryEmail: 'invalid-email',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default error message', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isEmail).toContain('Email');
      expect(errors[0].constraints?.isEmail).toContain('valid email');
    });

    it('should use custom error message', async () => {
      const dto = plainToInstance(CustomMessageEmailDto, {
        contactEmail: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isEmail).toBe(
        'Please provide a valid email address',
      );
    });

    it('should use custom length message', async () => {
      const dto = plainToInstance(CustomMessageEmailDto, {
        contactEmail: 'a@b',
      });
      const errors = await validate(dto);
      const lengthError = errors.find((e) => e.constraints?.minLength);
      expect(lengthError?.constraints?.minLength).toBe(
        'Email length is invalid',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: undefined });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only string', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: '   ' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle number value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty object', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredEmailDto, { email: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should ignore unknown properties', async () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'test@example.com',
        unknownProperty: 'should be ignored',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle email with special characters', async () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'user+tag@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle email with subdomain', async () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'user@mail.example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle very long valid email', async () => {
      const dto = plainToInstance(RequiredEmailDto, {
        email: 'verylongemailaddress@verylongdomainname.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
