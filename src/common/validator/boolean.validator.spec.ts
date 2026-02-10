import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateBoolean, BooleanErrorMessages } from './boolean.validator';

// Test DTOs
class RequiredBooleanDto {
  @ValidateBoolean({ label: 'Is Active' })
  isActive: boolean;
}

class OptionalBooleanDto {
  @ValidateBoolean({ label: 'Is Verified', optional: true })
  isVerified?: boolean;
}

class CustomMessageBooleanDto {
  @ValidateBoolean({
    label: 'Terms Accepted',
    messageOptions: {
      typeMessage: 'You must accept the terms and conditions',
      emptyMessage: 'Terms acceptance is required',
    },
  })
  termsAccepted: boolean;
}

describe('ValidateBoolean', () => {
  describe('Basic Validation', () => {
    it('should validate true value', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate false value', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: false });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for non-boolean values', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 'yes' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('isActive');
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredBooleanDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should transform string "true" to boolean true', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 'true' });
      expect(dto.isActive).toBe(true);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string "false" to boolean false', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 'false' });
      expect(dto.isActive).toBe(false);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string "1" to boolean true', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: '1' });
      expect(dto.isActive).toBe(true);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string "0" to boolean false', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: '0' });
      expect(dto.isActive).toBe(false);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform number 1 to boolean true', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 1 });
      expect(dto.isActive).toBe(true);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform number 0 to boolean false', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 0 });
      expect(dto.isActive).toBe(false);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle case-insensitive string transformation', () => {
      const dto1 = plainToInstance(RequiredBooleanDto, { isActive: 'TRUE' });
      expect(dto1.isActive).toBe(true);

      const dto2 = plainToInstance(RequiredBooleanDto, { isActive: 'FALSE' });
      expect(dto2.isActive).toBe(false);
    });

    it('should trim whitespace before transformation', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: '  true  ' });
      expect(dto.isActive).toBe(true);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should not transform invalid string values', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 'yes' });
      expect(dto.isActive).toBe('yes');
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should not transform numbers other than 0 and 1', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 2 });
      expect(dto.isActive).toBe(2);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalBooleanDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalBooleanDto, { isVerified: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalBooleanDto, {
        isVerified: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default type error message', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isBoolean).toBe(
        BooleanErrorMessages.type('Is Active'),
      );
    });

    it('should use default empty error message', async () => {
      const dto = plainToInstance(RequiredBooleanDto, {});
      const errors = await validate(dto);
      const emptyError = errors.find((e) => e.constraints?.isNotEmpty);
      expect(emptyError?.constraints?.isNotEmpty).toBe(
        BooleanErrorMessages.empty('Is Active'),
      );
    });

    it('should use custom type message', async () => {
      const dto = plainToInstance(CustomMessageBooleanDto, {
        termsAccepted: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isBoolean).toBe(
        'You must accept the terms and conditions',
      );
    });

    it('should use custom empty message', async () => {
      const dto = plainToInstance(CustomMessageBooleanDto, {});
      const errors = await validate(dto);
      const emptyError = errors.find((e) => e.constraints?.isNotEmpty);
      expect(emptyError?.constraints?.isNotEmpty).toBe(
        'Terms acceptance is required',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredBooleanDto, { isActive: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
