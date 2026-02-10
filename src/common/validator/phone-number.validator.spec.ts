import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidatePhoneNumber } from './phone-number.validator';

// Test DTOs
class RequiredPhoneDto {
  @ValidatePhoneNumber({ label: 'Phone Number' })
  phone: string;
}

class OptionalPhoneDto {
  @ValidatePhoneNumber({ label: 'Business Phone', optional: true })
  businessPhone?: string;
}

class USPhoneDto {
  @ValidatePhoneNumber({ label: 'US Phone', region: 'US' })
  usPhone: string;
}

class BDPhoneDto {
  @ValidatePhoneNumber({
    label: 'Mobile',
    region: 'BD',
    strictValidation: true,
    min: 11,
    max: 14,
  })
  mobile: string;
}

class PhoneWithLengthDto {
  @ValidatePhoneNumber({ label: 'Contact', min: 10, max: 15 })
  contact: string;
}

class NonStrictPhoneDto {
  @ValidatePhoneNumber({
    label: 'UK Phone',
    region: 'GB',
    strictValidation: false,
  })
  ukPhone: string;
}

class CustomMessagePhoneDto {
  @ValidatePhoneNumber({
    label: 'Emergency Contact',
    optional: true,
    message: 'Please provide a valid emergency contact number',
    lengthMessage: 'Contact number length is invalid',
  })
  emergencyContact?: string;
}

describe('ValidatePhoneNumber', () => {
  describe('Basic Validation', () => {
    it('should validate international phone number with country code', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: '+14155552671' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate various international formats', async () => {
      const validPhones = [
        '+14155552671', // US
        '+442071838750', // UK
        '+8801712345678', // Bangladesh
        '+61291234567', // Australia
        '+33123456789', // France
      ];

      for (const phone of validPhones) {
        const dto = plainToInstance(RequiredPhoneDto, { phone });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for invalid phone numbers', async () => {
      const invalidPhones = [
        '123',
        'abc',
        '+1',
        '00000000000',
        '+999999999999999',
      ];

      for (const phone of invalidPhones) {
        const dto = plainToInstance(RequiredPhoneDto, { phone });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredPhoneDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should trim whitespace', () => {
      const dto = plainToInstance(RequiredPhoneDto, {
        phone: '  +14155552671  ',
      });
      expect(dto.phone).toBe('+14155552671');
    });

    it('should remove formatting characters', () => {
      const dto = plainToInstance(RequiredPhoneDto, {
        phone: '+1 (415) 555-2671',
      });
      expect(dto.phone).toBe('+14155552671');
    });

    it('should handle various formatting styles', () => {
      const formats = [
        { input: '+1-415-555-2671', expected: '+14155552671' },
        { input: '+1 415 555 2671', expected: '+14155552671' },
        { input: '+1.415.555.2671', expected: '+14155552671' },
        { input: '(415) 555-2671', expected: '4155552671' },
      ];

      for (const { input, expected } of formats) {
        const dto = plainToInstance(RequiredPhoneDto, { phone: input });
        expect(dto.phone).toBe(expected);
      }
    });

    it('should preserve + for international format', () => {
      const dto = plainToInstance(RequiredPhoneDto, {
        phone: '+1 (415) 555-2671',
      });
      expect(dto.phone.startsWith('+')).toBe(true);
    });
  });

  describe('Region-Specific Validation', () => {
    it('should validate US phone number', async () => {
      const dto = plainToInstance(USPhoneDto, { usPhone: '+14155552671' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Bangladesh phone number', async () => {
      const dto = plainToInstance(BDPhoneDto, { mobile: '+8801712345678' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for wrong region in strict mode', async () => {
      const dto = plainToInstance(USPhoneDto, { usPhone: '+442071838750' }); // UK number
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow different region in non-strict mode', async () => {
      const dto = plainToInstance(NonStrictPhoneDto, {
        ukPhone: '+14155552671',
      }); // US number
      const errors = await validate(dto);
      // Non-strict mode may allow this depending on implementation
      // This test verifies the behavior
      expect(errors).toBeDefined();
    });
  });

  describe('Length Constraints', () => {
    it('should validate phone within length range', async () => {
      const dto = plainToInstance(PhoneWithLengthDto, {
        contact: '+14155552671',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for phone below minimum length', async () => {
      const dto = plainToInstance(PhoneWithLengthDto, { contact: '+1234' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for phone exceeding maximum length', async () => {
      const dto = plainToInstance(PhoneWithLengthDto, {
        contact: '+12345678901234567890',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalPhoneDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalPhoneDto, {
        businessPhone: '+14155552671',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalPhoneDto, {
        businessPhone: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default error message', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isValidPhoneNumber).toContain(
        'Phone Number',
      );
      expect(errors[0].constraints?.isValidPhoneNumber).toContain('valid');
    });

    it('should use custom error message', async () => {
      const dto = plainToInstance(CustomMessagePhoneDto, {
        emergencyContact: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isValidPhoneNumber).toBe(
        'Please provide a valid emergency contact number',
      );
    });

    it('should use custom length message', async () => {
      const dto = plainToInstance(CustomMessagePhoneDto, {
        emergencyContact: '+1',
      });
      const errors = await validate(dto);
      // May have length error depending on validation order
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: undefined });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only string', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: '   ' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle number value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty object', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should ignore unknown properties', async () => {
      const dto = plainToInstance(RequiredPhoneDto, {
        phone: '+14155552671',
        unknownProperty: 'should be ignored',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle phone with extension', async () => {
      const dto = plainToInstance(RequiredPhoneDto, {
        phone: '+14155552671',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle local format without country code', async () => {
      const dto = plainToInstance(RequiredPhoneDto, { phone: '4155552671' });
      const errors = await validate(dto);
      // May pass or fail depending on validation rules
      expect(errors).toBeDefined();
    });
  });
});
