/**
 * CategoryService Integration Tests
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION TEST vs UNIT TEST - What's the difference?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UNIT TEST (category.service.spec.ts):
 *   - Uses MOCK database (fake PrismaService)
 *   - Fast (~1 second for all tests)
 *   - Tests logic in isolation
 *   - Does NOT verify real database queries work
 *
 * INTEGRATION TEST (this file):
 *   - Uses REAL database (actual PostgreSQL)
 *   - Slower (~5-10 seconds for all tests)
 *   - Tests real Prisma queries
 *   - Verifies data actually persists and relationships work
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW TO RUN THIS TEST:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. Make sure your Docker database is running:
 *      $ pnpm docker:up
 *
 *   2. Run integration tests:
 *      $ pnpm test:integration
 *
 *   Or run just this file:
 *      $ pnpm test:integration category.integration
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryService } from '../../src/modules/category/category.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SlugService } from '../../src/common/utils/slug.utils';
import { ProductStatus } from '../../generated/prisma/client';

describe('CategoryService (Integration)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // VARIABLES
  // ═══════════════════════════════════════════════════════════════════════════

  let service: CategoryService;
  let prisma: PrismaService;

  // Test data IDs - we'll create these in beforeAll
  let testTenantId: string;
  let testCategoryId: string;
  let parentCategoryId: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP - Runs ONCE before all tests
  // ═══════════════════════════════════════════════════════════════════════════

  beforeAll(async () => {
    /**
     * STEP 1: Create a NestJS testing module
     *
     * Unlike unit tests where we inject mocks:
     *   { provide: PrismaService, useValue: mockPrisma }  ← MOCK
     *
     * In integration tests we use the REAL services:
     *   PrismaService  ← REAL (connects to actual database)
     *   SlugService    ← REAL (connects to actual database)
     */
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        PrismaService, // ← REAL! Not mocked!
        SlugService, // ← REAL! Not mocked!
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);

    /**
     * STEP 2: Create a test tenant
     *
     * In your multi-tenant app, all data belongs to a tenant.
     * We create a special "test tenant" for our tests.
     */
    const testTenant = await prisma.tenant.create({
      data: {
        name: `Integration Test Tenant ${Date.now()}`,
        companyType: 'LIMITED_LIABILITY_COMPANY',
        industry: 'TECHNOLOGY',
        businessEmail: 'test@integration.test',
        businessPhone: '+1234567890',
        establishedYear: '2024',
        status: 'ACTIVE',
      },
    });
    testTenantId = testTenant.id;

    console.log(`✅ Created test tenant: ${testTenantId}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEARDOWN - Runs ONCE after all tests
  // ═══════════════════════════════════════════════════════════════════════════

  afterAll(async () => {
    /**
     * CLEANUP: Delete all test data
     *
     * Order matters! Delete child records before parent records.
     * Otherwise, foreign key constraints will fail.
     */
    try {
      // 1. Delete all categories for our test tenant
      await prisma.productCategory.deleteMany({
        where: { tenantId: testTenantId },
      });

      // 2. Delete the test tenant itself
      await prisma.tenant.delete({
        where: { id: testTenantId },
      });

      console.log('✅ Cleaned up test data');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error);
    }

    // 3. Close the database connection
    await prisma.$disconnect();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC INSTANTIATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a real database connection', async () => {
      // This proves we're connected to a real database
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE - Testing with REAL database
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a category in the REAL database', async () => {
      /**
       * NOTICE: No mocking here!
       *
       * In unit tests we did:
       *   mockPrisma.productCategory.create.mockResolvedValue(...)
       *
       * In integration tests, we just call the service directly.
       * It uses the REAL PrismaService -> REAL PostgreSQL database.
       */

      // Act - Call the real service
      const result = await service.create(testTenantId, {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        status: ProductStatus.ACTIVE,
      });

      // Store the ID for later tests
      testCategoryId = result.id;

      // Assert - Check the returned data
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Electronics');
      expect(result.slug).toBe('electronics'); // SlugService generated this!
      expect(result.description).toBe('Electronic devices and gadgets');
      expect(result.tenantId).toBe(testTenantId);

      /**
       * BONUS: Verify it's actually in the database!
       *
       * This is something you CAN'T do in unit tests with mocks.
       * Here we directly query the database to confirm.
       */
      const inDatabase = await prisma.productCategory.findUnique({
        where: { id: result.id },
      });
      expect(inDatabase).not.toBeNull();
      expect(inDatabase?.name).toBe('Electronics');

      console.log(`✅ Created category in DB: ${result.id}`);
    });

    it('should create a parent category and then a child category', async () => {
      // 1. Create parent category
      const parent = await service.create(testTenantId, {
        name: 'Computers & Laptops',
        status: ProductStatus.ACTIVE,
      });
      parentCategoryId = parent.id;

      // 2. Create child category with parent reference
      const child = await service.create(testTenantId, {
        name: 'Gaming Laptops',
        parentId: parentCategoryId,
        status: ProductStatus.ACTIVE,
      });

      // Assert - Child should have parent reference
      expect(child.parentId).toBe(parentCategoryId);
      expect(child.parent).toBeDefined();
      expect(child.parent?.name).toBe('Computers & Laptops');

      console.log(
        `✅ Created parent-child relationship: ${parentCategoryId} -> ${child.id}`,
      );
    });

    it('should auto-generate unique slugs for duplicate names', async () => {
      // Create first category
      const first = await service.create(testTenantId, {
        name: 'Test Category',
        status: ProductStatus.ACTIVE,
      });

      // Create second category with SAME name
      const second = await service.create(testTenantId, {
        name: 'Test Category',
        status: ProductStatus.ACTIVE,
      });

      // Slugs should be different!
      expect(first.slug).toBe('test-category');
      expect(second.slug).toBe('test-category-1'); // Auto-incremented!

      console.log(`✅ Unique slugs: "${first.slug}" and "${second.slug}"`);
    });

    it('should throw NotFoundException for non-existent parent', async () => {
      // Try to create with fake parent ID
      await expect(
        service.create(testTenantId, {
          name: 'Orphan Category',
          parentId: '00000000-0000-0000-0000-000000000000', // Fake ID
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND ALL - Testing pagination and filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return paginated categories from the database', async () => {
      // Act
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBeGreaterThanOrEqual(1);

      // All returned categories should belong to our test tenant
      result.data.forEach((category) => {
        expect(category.tenantId).toBe(testTenantId);
      });

      console.log(`✅ Found ${result.meta.total} categories`);
    });

    it('should filter by status', async () => {
      // Act - Filter only ACTIVE categories
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 10,
        status: ProductStatus.ACTIVE,
      });

      // Assert - All should be ACTIVE
      result.data.forEach((category) => {
        expect(category.status).toBe(ProductStatus.ACTIVE);
      });
    });

    it('should search by name', async () => {
      // We created "Electronics" earlier
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 10,
        search: 'Electronics',
      });

      // Should find at least our Electronics category
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.some((c) => c.name === 'Electronics')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND ONE - Testing single record retrieval
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should find a category by ID', async () => {
      // Act - Find the category we created earlier
      const result = await service.findOne(testTenantId, testCategoryId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testCategoryId);
      expect(result.name).toBe('Electronics');
    });

    it('should find a category by slug', async () => {
      // Act - Find by slug instead of ID
      const result = await service.findOne(testTenantId, 'electronics');

      // Assert
      expect(result).toBeDefined();
      expect(result.slug).toBe('electronics');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      await expect(
        service.findOne(testTenantId, 'non-existent-slug-12345'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT find categories from other tenants', async () => {
      // Create another tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: `Other Tenant ${Date.now()}`,
          companyType: 'LIMITED_LIABILITY_COMPANY',
          industry: 'RETAIL',
          businessEmail: 'other@test.test',
          businessPhone: '+9876543210',
          establishedYear: '2024',
          status: 'ACTIVE',
        },
      });

      // Try to find our category using the OTHER tenant's ID
      // This should fail because of multi-tenant isolation!
      await expect(
        service.findOne(otherTenant.id, testCategoryId),
      ).rejects.toThrow(NotFoundException);

      // Cleanup
      await prisma.tenant.delete({ where: { id: otherTenant.id } });

      console.log('✅ Multi-tenant isolation verified');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE - Testing database updates
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update a category', async () => {
      // Act
      const result = await service.update(testTenantId, testCategoryId, {
        name: 'Updated Electronics',
        description: 'Updated description',
      });

      // Assert
      expect(result.name).toBe('Updated Electronics');
      expect(result.description).toBe('Updated description');
      expect(result.slug).toBe('updated-electronics'); // Slug also updated!

      // Verify in database
      const inDatabase = await prisma.productCategory.findUnique({
        where: { id: testCategoryId },
      });
      expect(inDatabase?.name).toBe('Updated Electronics');

      console.log('✅ Category updated in database');
    });

    it('should throw NotFoundException when updating non-existent category', async () => {
      await expect(
        service.update(testTenantId, '00000000-0000-0000-0000-000000000000', {
          name: 'Ghost Category',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE - Testing soft delete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    let categoryToDelete: string;

    beforeAll(async () => {
      // Create a category specifically for deletion tests
      const category = await service.create(testTenantId, {
        name: 'To Be Deleted',
        status: ProductStatus.ACTIVE,
      });
      categoryToDelete = category.id;
    });

    it('should soft delete a category (sets deletedAt instead of actual delete)', async () => {
      // Act
      await service.remove(testTenantId, categoryToDelete);

      // Assert - Category still exists but has deletedAt set
      const inDatabase = await prisma.productCategory.findUnique({
        where: { id: categoryToDelete },
      });

      // The record still exists!
      expect(inDatabase).not.toBeNull();
      // But it's marked as deleted
      expect(inDatabase?.deletedAt).not.toBeNull();

      console.log('✅ Category soft-deleted (deletedAt set)');
    });

    it('should throw ConflictException when deleting category with children', async () => {
      // The parentCategoryId has a child (Gaming Laptops)
      await expect(
        service.remove(testTenantId, parentCategoryId),
      ).rejects.toThrow(ConflictException);

      console.log('✅ Cannot delete parent with children');
    });
  });
});
