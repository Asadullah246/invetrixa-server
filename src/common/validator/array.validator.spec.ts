import { plainToInstance } from 'class-transformer';
import { validate, IsString } from 'class-validator';
import { ValidateArray } from './array.validator';

// Test DTOs for different scenarios
class StringArrayDto {
  @ValidateArray({ label: 'Tags', itemType: 'string' })
  tags: string[];
}

class OptionalStringArrayDto {
  @ValidateArray({ label: 'Tags', itemType: 'string', optional: true })
  tags?: string[];
}

class StringArrayWithLengthDto {
  @ValidateArray({
    label: 'Tags',
    itemType: 'string',
    minLength: 3,
    maxLength: 10,
  })
  tags: string[];
}

class StringArrayWithSizeDto {
  @ValidateArray({
    label: 'Tags',
    itemType: 'string',
    minSize: 2,
    maxSize: 5,
  })
  tags: string[];
}

class NumberArrayDto {
  @ValidateArray({ label: 'Scores', itemType: 'number' })
  scores: number[];
}

class BooleanArrayDto {
  @ValidateArray({ label: 'Flags', itemType: 'boolean' })
  flags: boolean[];
}

// Custom class for nested validation
class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;
}

class CustomClassArrayDto {
  @ValidateArray({
    label: 'Addresses',
    itemType: AddressDto,
    minSize: 1,
    maxSize: 5,
  })
  addresses: AddressDto[];
}

// Custom validator for enum-like values
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

class EnumArrayDto {
  @ValidateArray({
    label: 'Roles',
    itemType: 'custom',
    itemValidator: (value: UserRole) => Object.values(UserRole).includes(value),
    itemTypeMessage: 'Invalid role',
  })
  roles: UserRole[];
}

// Custom validator for complex objects
interface Coordinate {
  lat: number;
  lng: number;
}

class CoordinateArrayDto {
  @ValidateArray({
    label: 'Coordinates',
    itemType: 'custom',
    itemValidator: (value: Coordinate) => {
      return (
        typeof value === 'object' &&
        typeof value.lat === 'number' &&
        typeof value.lng === 'number' &&
        value.lat >= -90 &&
        value.lat <= 90 &&
        value.lng >= -180 &&
        value.lng <= 180
      );
    },
    itemTypeMessage: 'Invalid coordinate format',
  })
  coordinates: Coordinate[];
}

// Custom transform
class DateArrayDto {
  @ValidateArray({
    label: 'Timestamps',
    itemType: 'custom',
    transform: (value: string | number | Date) => new Date(value),
    itemValidator: (value: Date) =>
      value instanceof Date && !isNaN(value.getTime()),
    itemTypeMessage: 'Invalid timestamp format',
  })
  timestamps: Date[];
}

// Union type validation
class UnionArrayDto {
  @ValidateArray({
    label: 'Mixed Values',
    itemType: 'custom',
    itemValidator: (value) => {
      return typeof value === 'string' || typeof value === 'number';
    },
    itemTypeMessage: 'Items must be strings or numbers',
  })
  mixedValues: Array<string | number>;
}

// Custom error messages
class CustomMessageDto {
  @ValidateArray({
    label: 'Items',
    itemType: 'string',
    message: 'Custom array message',
    itemTypeMessage: 'Custom type message',
    itemLengthMessage: 'Custom length message',
    arraySizeMessage: 'Custom size message',
    minLength: 5,
    minSize: 2,
  })
  items: string[];
}

describe('ValidateArray', () => {
  describe('Built-in Types', () => {
    describe('String Arrays', () => {
      it('should validate a valid string array', async () => {
        const dto = plainToInstance(StringArrayDto, {
          tags: ['tag1', 'tag2', 'tag3'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should trim whitespace from string items', () => {
        const dto = plainToInstance(StringArrayDto, {
          tags: ['  tag1  ', '  tag2  '],
        });
        expect(dto.tags).toEqual(['tag1', 'tag2']);
      });

      it('should fail when array contains non-string items', async () => {
        const dto = plainToInstance(StringArrayDto, {
          tags: ['tag1', 123, 'tag3'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('tags');
      });

      it('should fail when value is not an array', async () => {
        const dto = plainToInstance(StringArrayDto, {
          tags: 'not-an-array',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('isArray');
      });

      it('should fail when required array is missing', async () => {
        const dto = plainToInstance(StringArrayDto, {});
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should pass when optional array is missing', async () => {
        const dto = plainToInstance(OptionalStringArrayDto, {});
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('Number Arrays', () => {
      it('should validate a valid number array', async () => {
        const dto = plainToInstance(NumberArrayDto, {
          scores: [1, 2, 3, 4, 5],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail when array contains non-number items', async () => {
        const dto = plainToInstance(NumberArrayDto, {
          scores: [1, 'two', 3],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should pass when array contains numeric String items', async () => {
        const dto = plainToInstance(NumberArrayDto, {
          scores: [1, '2', 3],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    describe('Boolean Arrays', () => {
      it('should validate a valid boolean array', async () => {
        const dto = plainToInstance(BooleanArrayDto, {
          flags: [true, false, true],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail when array contains non-boolean items', async () => {
        const dto = plainToInstance(BooleanArrayDto, {
          flags: [true, 'false', true],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('String Length Constraints', () => {
    it('should validate strings within length constraints', async () => {
      const dto = plainToInstance(StringArrayWithLengthDto, {
        tags: ['abc', 'defgh', 'ijklmnopqr'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when string is too short', async () => {
      const dto = plainToInstance(StringArrayWithLengthDto, {
        tags: ['ab', 'valid'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when string is too long', async () => {
      const dto = plainToInstance(StringArrayWithLengthDto, {
        tags: ['valid', 'this-is-too-long'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Array Size Constraints', () => {
    it('should validate array within size constraints', async () => {
      const dto = plainToInstance(StringArrayWithSizeDto, {
        tags: ['tag1', 'tag2', 'tag3'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when array is too small', async () => {
      const dto = plainToInstance(StringArrayWithSizeDto, {
        tags: ['tag1'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });

    it('should fail when array is too large', async () => {
      const dto = plainToInstance(StringArrayWithSizeDto, {
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
    });
  });

  describe('Custom Class Validation', () => {
    it('should validate array of custom class instances', async () => {
      const dto = plainToInstance(CustomClassArrayDto, {
        addresses: [
          { street: '123 Main St', city: 'New York' },
          { street: '456 Oak Ave', city: 'Boston' },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should respect size constraints for custom classes', async () => {
      const dto = plainToInstance(CustomClassArrayDto, {
        addresses: [],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });
  });

  describe('Custom Validators', () => {
    describe('Enum Validation', () => {
      it('should validate valid enum values', async () => {
        const dto = plainToInstance(EnumArrayDto, {
          roles: [UserRole.ADMIN, UserRole.USER],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for invalid enum values', async () => {
        const dto = plainToInstance(EnumArrayDto, {
          roles: ['admin', 'invalid-role'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Complex Object Validation', () => {
      it('should validate complex objects without DTO', async () => {
        const dto = plainToInstance(CoordinateArrayDto, {
          coordinates: [
            { lat: 40.7128, lng: -74.006 },
            { lat: 51.5074, lng: -0.1278 },
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for invalid coordinates', async () => {
        const dto = plainToInstance(CoordinateArrayDto, {
          coordinates: [
            { lat: 100, lng: -74.006 }, // Invalid latitude
            { lat: 51.5074, lng: -200 }, // Invalid longitude
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should fail for malformed objects', async () => {
        const dto = plainToInstance(CoordinateArrayDto, {
          coordinates: [{ lat: 40.7128 }], // Missing lng
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Custom Transform', () => {
      it('should transform values using custom transform function', () => {
        const dto = plainToInstance(DateArrayDto, {
          timestamps: ['2024-01-01', '2024-12-31'],
        });
        expect(dto.timestamps[0]).toBeInstanceOf(Date);
        expect(dto.timestamps[1]).toBeInstanceOf(Date);
      });

      it('should validate transformed values', async () => {
        const dto = plainToInstance(DateArrayDto, {
          timestamps: ['2024-01-01', '2024-12-31'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for invalid date strings', async () => {
        const dto = plainToInstance(DateArrayDto, {
          timestamps: ['invalid-date'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Union Type Validation', () => {
      it('should validate union types', async () => {
        const dto = plainToInstance(UnionArrayDto, {
          mixedValues: ['string', 123, 'another', 456],
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail for values not in union', async () => {
        const dto = plainToInstance(UnionArrayDto, {
          mixedValues: ['string', 123, true], // boolean not allowed
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Messages', () => {
    it('should use default error messages', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: 'not-an-array',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isArray).toContain(
        'Tags should be an array',
      );
    });

    it('should use custom error messages', async () => {
      const dto = plainToInstance(CustomMessageDto, {
        items: 'not-an-array',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isArray).toBe('Custom array message');
    });

    it('should use custom item type message', async () => {
      const dto = plainToInstance(CustomMessageDto, {
        items: ['ab'], // Too short
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.minLength).toBe('Custom length message');
    });

    it('should use custom size message', async () => {
      const dto = plainToInstance(CustomMessageDto, {
        items: ['valid-item'], // Only 1 item, needs 2
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.arrayMinSize).toBe('Custom size message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays when no minSize is set', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: [],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle undefined for optional fields', async () => {
      const dto = plainToInstance(OptionalStringArrayDto, {
        tags: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle null values', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle arrays with mixed valid and invalid items', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: ['valid', 123, 'also-valid', true],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle very large arrays', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `tag${i}`);
      const dto = plainToInstance(StringArrayDto, {
        tags: largeArray,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle arrays with special characters in strings', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: ['tag-1', 'tag_2', 'tag.3', 'tag@4', 'tag#5'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle arrays with unicode characters', async () => {
      const dto = plainToInstance(StringArrayDto, {
        tags: ['日本語', 'العربية', 'Ελληνικά', '🎉'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Async Validation', () => {
    it('should handle async custom validators', async () => {
      class AsyncValidatorDto {
        @ValidateArray({
          label: 'IDs',
          itemType: 'custom',
          itemValidator: async (value) => {
            // Simulate async validation (e.g., database lookup)
            await new Promise((resolve) => setTimeout(resolve, 10));
            return typeof value === 'string' && value.length > 0;
          },
        })
        ids: string[];
      }

      const dto = plainToInstance(AsyncValidatorDto, {
        ids: ['id1', 'id2', 'id3'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
