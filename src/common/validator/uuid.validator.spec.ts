import { validate } from 'class-validator';
import { ValidateUUID } from './uuid.validator';

class TestClass {
  @ValidateUUID({ label: 'ID', version: '4' })
  id: string;

  @ValidateUUID({ label: 'Optional ID', optional: true, version: '4' })
  optionalId?: string;

  @ValidateUUID({ label: 'Any Version ID', optional: true })
  anyVersionId?: string;

  constructor(partial: Partial<TestClass>) {
    Object.assign(this, partial);
  }
}

describe('ValidateUUID', () => {
  // v4 example:
  const realUUIDv4 = '550e8400-e29b-41d4-a716-446655440000';

  it('should validate a valid UUID v4', async () => {
    const model = new TestClass({ id: realUUIDv4 });
    const errors = await validate(model);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid UUID', async () => {
    const model = new TestClass({ id: 'invalid-uuid' });
    const errors = await validate(model);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUuid');
    expect(errors[0].constraints?.isUuid).toContain('ID must be a valid UUID');
  });

  it('should fail for empty string when required', async () => {
    const model = new TestClass({ id: '' });
    const errors = await validate(model);
    expect(errors.length).toBeGreaterThan(0);
    // It might fail both IsUUID and IsNotEmpty
    const constraints = errors[0].constraints;
    expect(constraints).toBeDefined();
    // Depending on order, check if at least one failure is present
    expect(constraints?.isNotEmpty || constraints?.isUuid).toBeDefined();
  });

  it('should pass for optional field when undefined', async () => {
    const model = new TestClass({ id: realUUIDv4 });
    const errors = await validate(model);
    expect(errors.length).toBe(0);
  });

  it('should validate optional field if provided', async () => {
    const model = new TestClass({ id: realUUIDv4, optionalId: 'invalid' });
    const errors = await validate(model);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('optionalId');
  });

  it('should validate any version if version not specified', async () => {
    // v1 UUID
    const v1 = '123e4567-e89b-12d3-a456-426614174000';
    const model = new TestClass({ id: realUUIDv4, anyVersionId: v1 });
    const errors = await validate(model);
    expect(errors.length).toBe(0);
  });
});
