/**
 * SlugUtils Unit Tests
 *
 * Tests for slug generation and SlugService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { generateSlug, SlugService } from './slug.utils';
import { PrismaService } from '@/common/prisma/prisma.service';

// ─────────────────────────────────────────────────────────────────────────────
// generateSlug - Pure Function Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  it('should convert text to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('one two three')).toBe('one-two-three');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Hello@World!')).toBe('helloworld');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('  hello world  ')).toBe('hello-world');
  });

  it('should collapse multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should handle special chars and spaces together', () => {
    expect(generateSlug('Product & Category (Test)')).toBe(
      'product-category-test',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SlugService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SlugService', () => {
  let service: SlugService;
  let mockPrisma: {
    productCategory: { findFirst: jest.Mock };
    product: { findFirst: jest.Mock };
  };

  const testTenantId = 'tenant-123';

  beforeEach(async () => {
    mockPrisma = {
      productCategory: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlugService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SlugService>(SlugService);
  });

  describe('createSlug', () => {
    it('should generate slug from name', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      const result = await service.createSlug({
        model: 'productCategory',
        tenantId: testTenantId,
        name: 'Electronics',
      });

      expect(result).toBe('electronics');
    });

    it('should use custom slug when provided', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      const result = await service.createSlug({
        model: 'productCategory',
        tenantId: testTenantId,
        slug: 'custom-slug',
        name: 'Electronics',
      });

      expect(result).toBe('custom-slug');
    });

    it('should throw error when neither slug nor name provided', async () => {
      await expect(
        service.createSlug({
          model: 'productCategory',
          tenantId: testTenantId,
        }),
      ).rejects.toThrow('Either slug or name must be provided');
    });

    it('should append counter when slug exists', async () => {
      mockPrisma.productCategory.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // 'electronics' exists
        .mockResolvedValueOnce({ id: 'existing-2' }) // 'electronics-1' exists
        .mockResolvedValueOnce(null); // 'electronics-2' is free

      const result = await service.createSlug({
        model: 'productCategory',
        tenantId: testTenantId,
        name: 'Electronics',
      });

      expect(result).toBe('electronics-2');
    });

    it('should exclude ID when checking uniqueness for updates', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      await service.createSlug({
        model: 'productCategory',
        tenantId: testTenantId,
        name: 'Electronics',
        excludeId: 'current-id',
      });

      expect(mockPrisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: testTenantId,
          slug: 'electronics',
          id: { not: 'current-id' },
        },
        select: { id: true },
      });
    });

    it('should work with product model', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.createSlug({
        model: 'product',
        tenantId: testTenantId,
        name: 'iPhone 15',
      });

      expect(result).toBe('iphone-15');
      expect(mockPrisma.product.findFirst).toHaveBeenCalled();
    });
  });
});
