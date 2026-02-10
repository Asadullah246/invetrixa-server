/**
 * CategoryService Unit Tests
 *
 * Tests the CategoryService in isolation with mocked dependencies.
 * Coverage level: Minimal (Happy paths + basic error scenarios)
 *
 * Note: Jest mock patterns require accessing `mock.calls[0][0]` which is typed
 * as `any` in Jest's type definitions. The `unbound-method` rule also triggers
 * on jest.Mock methods passed to expect(). These are unavoidable with Jest.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SlugService } from '@/common/utils/slug.utils';
import {
  createMockPrismaService,
  MockPrismaService,
  createMockCategoryWithParent,
  createMockCategoryWithCounts,
  createMockCategoryDetail,
  createMockCreateCategoryDto,
  createMockUpdateCategoryDto,
  createMockQueryCategory,
  TEST_IDS,
  mockUUID,
} from '@/common/test-utils';
import { ProductStatus } from 'generated/prisma/client';

describe('CategoryService', () => {
  let service: CategoryService;
  let mockPrisma: MockPrismaService;
  let mockSlugService: jest.Mocked<SlugService>;

  // ─────────────────────────────────────────────────────────────────────────
  // Test Setup
  // ─────────────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    // Create mocks
    mockPrisma = createMockPrismaService();
    mockSlugService = {
      createSlug: jest.fn(),
    } as unknown as jest.Mocked<SlugService>;

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SlugService, useValue: mockSlugService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Basic Instantiation
  // ─────────────────────────────────────────────────────────────────────────

  describe('instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validateCategoryIds
  // ─────────────────────────────────────────────────────────────────────────

  describe('validateCategoryIds', () => {
    it('should pass validation when all category IDs exist', async () => {
      // Arrange
      const categoryIds = [mockUUID(1), mockUUID(2)];
      mockPrisma.productCategory.findMany.mockResolvedValue([
        { id: mockUUID(1) },
        { id: mockUUID(2) },
      ]);

      // Act & Assert - should not throw
      await expect(
        service.validateCategoryIds(TEST_IDS.TENANT_ID, categoryIds),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException when some category IDs do not exist', async () => {
      // Arrange
      const categoryIds = [mockUUID(1), mockUUID(999)];
      mockPrisma.productCategory.findMany.mockResolvedValue([
        { id: mockUUID(1) },
      ]);

      // Act & Assert
      await expect(
        service.validateCategoryIds(TEST_IDS.TENANT_ID, categoryIds),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip validation when categoryIds array is empty', async () => {
      // Act
      await service.validateCategoryIds(TEST_IDS.TENANT_ID, []);

      // Assert - should not call database
      expect(mockPrisma.productCategory.findMany).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a category with valid data', async () => {
      // Arrange
      const dto = createMockCreateCategoryDto({
        name: 'Electronics',
        description: 'Electronic devices',
      });
      const createdCategory = createMockCategoryWithParent({
        name: 'Electronics',
        description: 'Electronic devices',
        slug: 'electronics',
      });

      mockSlugService.createSlug.mockResolvedValue('electronics');
      mockPrisma.productCategory.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.create(TEST_IDS.TENANT_ID, dto);

      // Assert
      expect(result).toEqual(createdCategory);

      // Verify slugService was called correctly
      expect(mockSlugService.createSlug).toHaveBeenCalled();
      const slugCall = mockSlugService.createSlug.mock.calls[0][0] as {
        model: string;
        tenantId: string;
        slug?: string;
        name: string;
      };
      expect(slugCall).toEqual({
        model: 'productCategory',
        tenantId: TEST_IDS.TENANT_ID,
        slug: undefined,
        name: 'Electronics',
      });

      // Verify prisma create was called with correct data
      expect(mockPrisma.productCategory.create).toHaveBeenCalled();
      const createCall = mockPrisma.productCategory.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      expect(createCall.data).toMatchObject({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
        tenantId: TEST_IDS.TENANT_ID,
      });
      expect(createCall.include).toBeDefined();
    });

    it('should create a category with parentId when parent exists', async () => {
      // Arrange
      const dto = createMockCreateCategoryDto({
        name: 'Smartphones',
        parentId: TEST_IDS.PARENT_CATEGORY_ID,
      });
      const parentCategory = { id: TEST_IDS.PARENT_CATEGORY_ID };
      const createdCategory = createMockCategoryWithParent({
        name: 'Smartphones',
        parentId: TEST_IDS.PARENT_CATEGORY_ID,
        parent: { id: TEST_IDS.PARENT_CATEGORY_ID, name: 'Electronics' },
      });

      mockPrisma.productCategory.findFirst.mockResolvedValue(parentCategory);
      mockSlugService.createSlug.mockResolvedValue('smartphones');
      mockPrisma.productCategory.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.create(TEST_IDS.TENANT_ID, dto);

      // Assert
      expect(result).toEqual(createdCategory);
      expect(mockPrisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: TEST_IDS.PARENT_CATEGORY_ID,
          tenantId: TEST_IDS.TENANT_ID,
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when parent category does not exist', async () => {
      // Arrange
      const dto = createMockCreateCategoryDto({
        name: 'Smartphones',
        parentId: mockUUID(999), // Non-existent parent
      });

      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(TEST_IDS.TENANT_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.productCategory.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      // Arrange
      const query = createMockQueryCategory({ page: 1, limit: 10 });
      const categories = [
        createMockCategoryWithCounts({ id: mockUUID(1), name: 'Electronics' }),
        createMockCategoryWithCounts({ id: mockUUID(2), name: 'Clothing' }),
      ];

      mockPrisma.productCategory.findMany.mockResolvedValue(categories);
      mockPrisma.productCategory.count.mockResolvedValue(2);

      // Act
      const result = await service.findAll(TEST_IDS.TENANT_ID, query);

      // Assert
      expect(result.data).toEqual(categories);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBe(2);
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      const query = createMockQueryCategory();
      mockPrisma.productCategory.findMany.mockResolvedValue([]);
      mockPrisma.productCategory.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll(TEST_IDS.TENANT_ID, query);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const query = createMockQueryCategory({ status: ProductStatus.ACTIVE });
      mockPrisma.productCategory.findMany.mockResolvedValue([]);
      mockPrisma.productCategory.count.mockResolvedValue(0);

      // Act
      await service.findAll(TEST_IDS.TENANT_ID, query);

      // Assert - verify filter was applied
      expect(mockPrisma.productCategory.findMany).toHaveBeenCalled();
      const callArgs = mockPrisma.productCategory.findMany.mock
        .calls[0]?.[0] as { where?: unknown } | undefined;
      expect(callArgs?.where).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      // Arrange
      // Use a proper UUID format that isUUID() will recognize
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const category = createMockCategoryDetail({ id: validUUID });
      mockPrisma.productCategory.findFirst.mockResolvedValue(category);

      // Act
      const result = await service.findOne(TEST_IDS.TENANT_ID, validUUID);

      // Assert
      expect(result).toEqual(category);
      expect(mockPrisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TEST_IDS.TENANT_ID,
          deletedAt: null,
          id: validUUID,
        }),
        include: expect.any(Object),
      });
    });

    it('should return a category by slug', async () => {
      // Arrange
      const category = createMockCategoryDetail({ slug: 'electronics' });
      mockPrisma.productCategory.findFirst.mockResolvedValue(category);

      // Act
      const result = await service.findOne(TEST_IDS.TENANT_ID, 'electronics');

      // Assert
      expect(result).toEqual(category);
      expect(mockPrisma.productCategory.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TEST_IDS.TENANT_ID,
          deletedAt: null,
          slug: 'electronics',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(TEST_IDS.TENANT_ID, mockUUID(999)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a category with valid data', async () => {
      // Arrange
      const dto = createMockUpdateCategoryDto({ name: 'Updated Electronics' });
      const existing = { id: TEST_IDS.CATEGORY_ID, slug: 'electronics' };
      const updated = createMockCategoryWithParent({
        id: TEST_IDS.CATEGORY_ID,
        name: 'Updated Electronics',
        slug: 'updated-electronics',
      });

      mockPrisma.productCategory.findFirst.mockResolvedValue(existing);
      mockSlugService.createSlug.mockResolvedValue('updated-electronics');
      mockPrisma.productCategory.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(
        TEST_IDS.TENANT_ID,
        TEST_IDS.CATEGORY_ID,
        dto,
      );

      // Assert
      expect(result).toEqual(updated);
      expect(mockPrisma.productCategory.update).toHaveBeenCalledWith({
        where: { id: TEST_IDS.CATEGORY_ID },
        data: expect.objectContaining({
          name: 'Updated Electronics',
          slug: 'updated-electronics',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      const dto = createMockUpdateCategoryDto({ name: 'Updated' });
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(TEST_IDS.TENANT_ID, mockUUID(999), dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when setting category as its own parent', async () => {
      // Arrange
      const categoryId = TEST_IDS.CATEGORY_ID;
      const dto = createMockUpdateCategoryDto({ parentId: categoryId }); // Self-reference
      const existing = { id: categoryId, slug: 'electronics' };

      mockPrisma.productCategory.findFirst.mockResolvedValue(existing);

      // Act & Assert
      await expect(
        service.update(TEST_IDS.TENANT_ID, categoryId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when parent category does not exist', async () => {
      // Arrange
      const dto = createMockUpdateCategoryDto({ parentId: mockUUID(999) });
      const existing = { id: TEST_IDS.CATEGORY_ID, slug: 'electronics' };

      mockPrisma.productCategory.findFirst
        .mockResolvedValueOnce(existing) // First call - check category exists
        .mockResolvedValueOnce(null); // Second call - check parent exists

      // Act & Assert
      await expect(
        service.update(TEST_IDS.TENANT_ID, TEST_IDS.CATEGORY_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete a category', async () => {
      // Arrange
      const category = {
        id: TEST_IDS.CATEGORY_ID,
        name: 'Electronics',
        _count: { children: 0, products: 0 },
      };

      mockPrisma.productCategory.findFirst.mockResolvedValue(category);
      mockPrisma.productCategory.update.mockResolvedValue({
        ...category,
        deletedAt: new Date(),
      });

      // Act
      await service.remove(TEST_IDS.TENANT_ID, TEST_IDS.CATEGORY_ID);

      // Assert
      expect(mockPrisma.productCategory.update).toHaveBeenCalledWith({
        where: { id: TEST_IDS.CATEGORY_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove(TEST_IDS.TENANT_ID, mockUUID(999)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when category has children', async () => {
      // Arrange
      const category = {
        id: TEST_IDS.CATEGORY_ID,
        name: 'Electronics',
        _count: { children: 3, products: 0 },
      };

      mockPrisma.productCategory.findFirst.mockResolvedValue(category);

      // Act & Assert
      await expect(
        service.remove(TEST_IDS.TENANT_ID, TEST_IDS.CATEGORY_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when category has products', async () => {
      // Arrange
      const category = {
        id: TEST_IDS.CATEGORY_ID,
        name: 'Electronics',
        _count: { children: 0, products: 5 },
      };

      mockPrisma.productCategory.findFirst.mockResolvedValue(category);

      // Act & Assert
      await expect(
        service.remove(TEST_IDS.TENANT_ID, TEST_IDS.CATEGORY_ID),
      ).rejects.toThrow(ConflictException);
    });
  });
});
