import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateEnum } from './enum.validator';

// Test enums
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
}

enum Status {
  ACTIVE = 1,
  INACTIVE = 0,
  PENDING = 2,
}

enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Test DTOs
class RequiredEnumDto {
  @ValidateEnum({ label: 'Role', enum: UserRole })
  role: UserRole;
}

class OptionalEnumDto {
  @ValidateEnum({ label: 'Status', enum: Status, optional: true })
  status?: Status;
}

class CustomMessageEnumDto {
  @ValidateEnum({
    label: 'Order Status',
    enum: OrderStatus,
    message: 'Invalid order status provided',
  })
  orderStatus: OrderStatus;
}

class PriorityEnumDto {
  @ValidateEnum({
    label: 'Priority',
    enum: Priority,
    optional: true,
    message: 'Priority must be LOW, MEDIUM, or HIGH',
  })
  priority?: Priority;
}

describe('ValidateEnum', () => {
  describe('String Enum Validation', () => {
    it('should validate valid enum value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: UserRole.ADMIN });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate all enum values', async () => {
      for (const role of Object.values(UserRole)) {
        const dto = plainToInstance(RequiredEnumDto, { role });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for invalid enum value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: 'INVALID' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredEnumDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Numeric Enum Validation', () => {
    it('should validate valid numeric enum value', async () => {
      const dto = plainToInstance(OptionalEnumDto, { status: Status.ACTIVE });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate all numeric enum values', async () => {
      const dto1 = plainToInstance(OptionalEnumDto, { status: Status.ACTIVE });
      const errors1 = await validate(dto1);
      expect(errors1.length).toBe(0);

      const dto2 = plainToInstance(OptionalEnumDto, {
        status: Status.INACTIVE,
      });
      const errors2 = await validate(dto2);
      expect(errors2.length).toBe(0);

      const dto3 = plainToInstance(OptionalEnumDto, { status: Status.PENDING });
      const errors3 = await validate(dto3);
      expect(errors3.length).toBe(0);
    });

    it('should fail for invalid numeric value', async () => {
      const dto = plainToInstance(OptionalEnumDto, { status: 99 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should trim whitespace from string enum values', () => {
      const dto = plainToInstance(RequiredEnumDto, { role: '  ADMIN  ' });
      expect(dto.role).toBe('ADMIN');
    });

    it('should validate after trimming', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: '  USER  ' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should not transform numeric values', () => {
      const dto = plainToInstance(OptionalEnumDto, { status: 1 });
      expect(dto.status).toBe(1);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalEnumDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalEnumDto, { status: Status.ACTIVE });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalEnumDto, { status: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default error message with enum values', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: 'INVALID' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isEnum).toContain('ADMIN');
      expect(errors[0].constraints?.isEnum).toContain('USER');
      expect(errors[0].constraints?.isEnum).toContain('MODERATOR');
    });

    it('should use custom error message', async () => {
      const dto = plainToInstance(CustomMessageEnumDto, {
        orderStatus: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isEnum).toBe(
        'Invalid order status provided',
      );
    });

    it('should use custom message for optional enum', async () => {
      const dto = plainToInstance(PriorityEnumDto, { priority: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isEnum).toBe(
        'Priority must be LOW, MEDIUM, or HIGH',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle case-sensitive enum values', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: 'admin' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle numeric string for numeric enum', async () => {
      const dto = plainToInstance(OptionalEnumDto, { status: '1' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredEnumDto, { role: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Enum Types', () => {
    it('should validate different enum types independently', async () => {
      const dto1 = plainToInstance(RequiredEnumDto, { role: UserRole.ADMIN });
      const errors1 = await validate(dto1);
      expect(errors1.length).toBe(0);

      const dto2 = plainToInstance(CustomMessageEnumDto, {
        orderStatus: OrderStatus.PENDING,
      });
      const errors2 = await validate(dto2);
      expect(errors2.length).toBe(0);

      const dto3 = plainToInstance(PriorityEnumDto, {
        priority: Priority.HIGH,
      });
      const errors3 = await validate(dto3);
      expect(errors3.length).toBe(0);
    });
  });
});
