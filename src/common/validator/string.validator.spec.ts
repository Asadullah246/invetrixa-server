import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateString } from './string.validator';

// Test DTOs
class RequiredStringDto {
  @ValidateString({ label: 'Name' })
  name: string;
}

class OptionalStringDto {
  @ValidateString({ label: 'Middle Name', optional: true })
  middleName?: string;
}

class StringWithMinDto {
  @ValidateString({ label: 'Username', min: 3 })
  username: string;
}

class StringWithMaxDto {
  @ValidateString({ label: 'Code', max: 10 })
  code: string;
}

class StringWithRangeDto {
  @ValidateString({ label: 'Title', min: 5, max: 50 })
  title: string;
}

class CustomMessageStringDto {
  @ValidateString({
    label: 'Description',
    min: 10,
    messageOptions: {
      typeMessage: 'Description must be text',
      emptyMessage: 'Description is required',
      lengthMessage: 'Description must be at least 10 characters',
    },
  })
  description: string;
}

describe('ValidateString', () => {
  describe('Basic Validation', () => {
    it('should validate a valid string', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: 'John Doe' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for non-string values', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredStringDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for empty string on required field', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('Transformation', () => {
    it('should trim whitespace from strings', () => {
      const dto = plainToInstance(RequiredStringDto, { name: '  John Doe  ' });
      expect(dto.name).toBe('John Doe');
    });

    it('should handle strings with only whitespace as undefined', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: '   ' });
      expect(dto.name).toBeUndefined();
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Length Constraints', () => {
    describe('Minimum Length', () => {
      it('should validate string meeting minimum length', async () => {
        const dto = plainToInstance(StringWithMinDto, { username: 'abc' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate string exceeding minimum length', async () => {
        const dto = plainToInstance(StringWithMinDto, { username: 'abcdef' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for string below minimum length', async () => {
        const dto = plainToInstance(StringWithMinDto, { username: 'ab' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('minLength');
      });
    });

    describe('Maximum Length', () => {
      it('should validate string meeting maximum length', async () => {
        const dto = plainToInstance(StringWithMaxDto, { code: '1234567890' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate string below maximum length', async () => {
        const dto = plainToInstance(StringWithMaxDto, { code: '12345' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for string exceeding maximum length', async () => {
        const dto = plainToInstance(StringWithMaxDto, { code: '12345678901' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('maxLength');
      });
    });

    describe('Range Length', () => {
      it('should validate string within range', async () => {
        const dto = plainToInstance(StringWithRangeDto, {
          title: 'Valid Title',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate string at minimum boundary', async () => {
        const dto = plainToInstance(StringWithRangeDto, { title: '12345' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate string at maximum boundary', async () => {
        const dto = plainToInstance(StringWithRangeDto, {
          title: '12345678901234567890123456789012345678901234567890',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for string below minimum', async () => {
        const dto = plainToInstance(StringWithRangeDto, { title: 'Test' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('isLength');
      });

      it('should fail for string above maximum', async () => {
        const dto = plainToInstance(StringWithRangeDto, {
          title: '123456789012345678901234567890123456789012345678901',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('isLength');
      });
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalStringDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalStringDto, { middleName: 'James' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty string for optional field', async () => {
      const dto = plainToInstance(OptionalStringDto, { middleName: '' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid type', async () => {
      const dto = plainToInstance(OptionalStringDto, { middleName: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use custom type message', async () => {
      const dto = plainToInstance(CustomMessageStringDto, { description: 123 });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isString).toBe('Description must be text');
    });

    it('should use custom empty message', async () => {
      const dto = plainToInstance(CustomMessageStringDto, {});
      const errors = await validate(dto);
      const emptyError = errors.find((e) => e.constraints?.isNotEmpty);
      expect(emptyError?.constraints?.isNotEmpty).toBe(
        'Description is required',
      );
    });

    it('should use custom length message', async () => {
      const dto = plainToInstance(CustomMessageStringDto, {
        description: 'Short',
      });
      const errors = await validate(dto);
      const lengthError = errors.find((e) => e.constraints?.minLength);
      expect(lengthError?.constraints?.minLength).toBe(
        'Description must be at least 10 characters',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredStringDto, { name: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const dto = plainToInstance(RequiredStringDto, {
        name: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle unicode characters', async () => {
      const dto = plainToInstance(RequiredStringDto, {
        name: '日本語 العربية Ελληνικά 🎉',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);
      const dto = plainToInstance(RequiredStringDto, { name: longString });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
