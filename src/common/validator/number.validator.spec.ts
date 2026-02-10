import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateNumber, NumberErrorMessages } from './number.validator';

// Test DTOs
class RequiredNumberDto {
  @ValidateNumber({ label: 'Age' })
  age: number;
}

class OptionalNumberDto {
  @ValidateNumber({ label: 'Score', optional: true })
  score?: number;
}

class NumberWithMinDto {
  @ValidateNumber({ label: 'Price', min: 0 })
  price: number;
}

class NumberWithMaxDto {
  @ValidateNumber({ label: 'Percentage', max: 100 })
  percentage: number;
}

class NumberWithRangeDto {
  @ValidateNumber({ label: 'Rating', min: 1, max: 5 })
  rating: number;
}

class PositiveNumberDto {
  @ValidateNumber({ label: 'Amount', positive: true })
  amount: number;
}

class NegativeNumberDto {
  @ValidateNumber({ label: 'Debt', negative: true })
  debt: number;
}

class IntegerNumberDto {
  @ValidateNumber({ label: 'Count', integer: true })
  count: number;
}

class NotZeroNumberDto {
  @ValidateNumber({ label: 'Multiplier', notZero: true })
  multiplier: number;
}

class ComplexNumberDto {
  @ValidateNumber({
    label: 'Rating',
    min: 1,
    max: 10,
    integer: true,
    positive: true,
    notZero: true,
  })
  rating: number;
}

class CustomMessageNumberDto {
  @ValidateNumber({
    label: 'Score',
    min: 0,
    max: 100,
    messageOptions: {
      typeMessage: 'Score must be a number',
      rangeMessage: 'Score must be between 0 and 100',
    },
  })
  score: number;
}

describe('ValidateNumber', () => {
  describe('Basic Validation', () => {
    it('should validate a valid number', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 25 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate zero', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate negative numbers', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate decimal numbers', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 25.5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for non-number values', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 'twenty' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredNumberDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should transform numeric string to number', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: '25' });
      expect(dto.age).toBe(25);
      expect(typeof dto.age).toBe('number');
    });

    it('should transform decimal string to number', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: '25.5' });
      expect(dto.age).toBe(25.5);
    });

    it('should transform negative string to number', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: '-10' });
      expect(dto.age).toBe(-10);
    });

    it('should trim whitespace before transformation', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: '  25  ' });
      expect(dto.age).toBe(25);
    });

    it('should not transform invalid numeric strings', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 'abc' });
      expect(dto.age).toBe('abc');
    });

    it('should handle scientific notation', () => {
      const dto = plainToInstance(RequiredNumberDto, { age: '1e2' });
      expect(dto.age).toBe(100);
    });
  });

  describe('Range Constraints', () => {
    describe('Minimum Value', () => {
      it('should validate number meeting minimum', async () => {
        const dto = plainToInstance(NumberWithMinDto, { price: 0 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate number exceeding minimum', async () => {
        const dto = plainToInstance(NumberWithMinDto, { price: 100 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for number below minimum', async () => {
        const dto = plainToInstance(NumberWithMinDto, { price: -1 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('min');
      });
    });

    describe('Maximum Value', () => {
      it('should validate number meeting maximum', async () => {
        const dto = plainToInstance(NumberWithMaxDto, { percentage: 100 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate number below maximum', async () => {
        const dto = plainToInstance(NumberWithMaxDto, { percentage: 50 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for number exceeding maximum', async () => {
        const dto = plainToInstance(NumberWithMaxDto, { percentage: 101 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('max');
      });
    });

    describe('Range Validation', () => {
      it('should validate number within range', async () => {
        const dto = plainToInstance(NumberWithRangeDto, { rating: 3 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate at minimum boundary', async () => {
        const dto = plainToInstance(NumberWithRangeDto, { rating: 1 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should validate at maximum boundary', async () => {
        const dto = plainToInstance(NumberWithRangeDto, { rating: 5 });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail below minimum', async () => {
        const dto = plainToInstance(NumberWithRangeDto, { rating: 0 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should fail above maximum', async () => {
        const dto = plainToInstance(NumberWithRangeDto, { rating: 6 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Positive Numbers', () => {
    it('should validate positive number', async () => {
      const dto = plainToInstance(PositiveNumberDto, { amount: 100 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for zero', async () => {
      const dto = plainToInstance(PositiveNumberDto, { amount: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isPositive');
    });

    it('should fail for negative number', async () => {
      const dto = plainToInstance(PositiveNumberDto, { amount: -10 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Negative Numbers', () => {
    it('should validate negative number', async () => {
      const dto = plainToInstance(NegativeNumberDto, { debt: -100 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for zero', async () => {
      const dto = plainToInstance(NegativeNumberDto, { debt: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNegative');
    });

    it('should fail for positive number', async () => {
      const dto = plainToInstance(NegativeNumberDto, { debt: 10 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integer Validation', () => {
    it('should validate integer', async () => {
      const dto = plainToInstance(IntegerNumberDto, { count: 10 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate zero as integer', async () => {
      const dto = plainToInstance(IntegerNumberDto, { count: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate negative integer', async () => {
      const dto = plainToInstance(IntegerNumberDto, { count: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for decimal number', async () => {
      const dto = plainToInstance(IntegerNumberDto, { count: 10.5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isInt');
    });
  });

  describe('Not Zero Validation', () => {
    it('should validate positive non-zero number', async () => {
      const dto = plainToInstance(NotZeroNumberDto, { multiplier: 5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate negative non-zero number', async () => {
      const dto = plainToInstance(NotZeroNumberDto, { multiplier: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for zero', async () => {
      const dto = plainToInstance(NotZeroNumberDto, { multiplier: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotZero');
    });
  });

  describe('Complex Validation', () => {
    it('should validate number meeting all constraints', async () => {
      const dto = plainToInstance(ComplexNumberDto, { rating: 5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for decimal when integer required', async () => {
      const dto = plainToInstance(ComplexNumberDto, { rating: 5.5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for zero when notZero required', async () => {
      const dto = plainToInstance(ComplexNumberDto, { rating: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for negative when positive required', async () => {
      const dto = plainToInstance(ComplexNumberDto, { rating: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalNumberDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalNumberDto, { score: 85 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalNumberDto, { score: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default type error message', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isNumber).toBe(
        NumberErrorMessages.type('Age'),
      );
    });

    it('should use custom type message', async () => {
      const dto = plainToInstance(CustomMessageNumberDto, { score: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isNumber).toBe('Score must be a number');
    });

    it('should use custom range message', async () => {
      const dto = plainToInstance(CustomMessageNumberDto, { score: 150 });
      const errors = await validate(dto);
      const rangeError = errors.find((e) => e.constraints?.max);
      expect(rangeError?.constraints?.max).toBe(
        'Score must be between 0 and 100',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined value', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: undefined });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle NaN', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: NaN });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle Infinity', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: Infinity });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0); // Infinity fails IsNumber validation
    });

    it('should handle -Infinity', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: -Infinity });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0); // -Infinity fails IsNumber validation
    });

    it('should handle very large numbers', async () => {
      const dto = plainToInstance(RequiredNumberDto, {
        age: Number.MAX_SAFE_INTEGER,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle very small numbers', async () => {
      const dto = plainToInstance(RequiredNumberDto, {
        age: Number.MIN_SAFE_INTEGER,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: true });
      const errors = await validate(dto);
      // Boolean true converts to 1, which is a valid number
      expect(errors.length).toBe(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredNumberDto, { age: [] });
      const errors = await validate(dto);
      // Empty array converts to 0, which is a valid number
      expect(errors.length).toBe(0);
    });
  });
});
