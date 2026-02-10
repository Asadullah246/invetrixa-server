/**
 * CategoryService Integration Tests - STANDARD LEVEL (~70-80% coverage)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STANDARD vs MINIMAL - What's the difference?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * MINIMAL (category.integration.spec.ts):
 *   - Happy paths only ✓
 *   - Basic error scenarios ✓
 *   - ~13 tests
 *
 * STANDARD (this file):
 *   - Everything in MINIMAL +
 *   - Edge cases ✓
 *   - Boundary conditions ✓
 *   - Multi-tenant isolation ✓
 *   - Soft delete behavior ✓
 *   - Relationship integrity ✓
 *   - ~25-30 tests
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN: pnpm test:integration category.standard
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from '../../src/modules/category/category.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SlugService } from '../../src/common/utils/slug.utils';
import { ProductStatus } from '../../generated/prisma/client';

describe('CategoryService - STANDARD LEVEL (Integration)', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  // Test data
  let testTenantId: string;
  let secondTenantId: string; // For multi-tenant tests
  const createdCategoryIds: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, PrismaService, SlugService],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create primary test tenant
    const testTenant = await prisma.tenant.create({
      data: {
        name: `Standard Test Tenant ${Date.now()}`,
        companyType: 'LIMITED_LIABILITY_COMPANY',
        industry: 'TECHNOLOGY',
        businessEmail: 'standard@test.test',
        businessPhone: '+1234567890',
        establishedYear: '2024',
        status: 'ACTIVE',
      },
    });
    testTenantId = testTenant.id;

    // Create second tenant for multi-tenant isolation tests
    const secondTenant = await prisma.tenant.create({
      data: {
        name: `Second Test Tenant ${Date.now()}`,
        companyType: 'LIMITED_LIABILITY_COMPANY',
        industry: 'RETAIL',
        businessEmail: 'second@test.test',
        businessPhone: '+9876543210',
        establishedYear: '2024',
        status: 'ACTIVE',
      },
    });
    secondTenantId = secondTenant.id;

    console.log('✅ Test tenants created');
  });

  afterAll(async () => {
    // Cleanup all created categories
    await prisma.productCategory.deleteMany({
      where: { tenantId: { in: [testTenantId, secondTenantId] } },
    });

    // Delete test tenants
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantId, secondTenantId] } },
    });

    await prisma.$disconnect();
    console.log('✅ Cleanup complete');
  });

  // Helper to track created categories for cleanup
  const trackCategory = (id: string) => {
    createdCategoryIds.push(id);
    return id;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create - Standard Level', () => {
    // ─── Happy Paths ───────────────────────────────────────────────────────────

    it('should create a category with minimal required fields', async () => {
      const result = await service.create(testTenantId, {
        name: 'Minimal Category',
      });

      trackCategory(result.id);

      expect(result.name).toBe('Minimal Category');
      expect(result.slug).toBe('minimal-category');
      expect(result.status).toBe(ProductStatus.DRAFT); // Default status per schema
      expect(result.parentId).toBeNull();
    });

    it('should create a category with all optional fields', async () => {
      const result = await service.create(testTenantId, {
        name: 'Full Category',
        slug: 'custom-slug',
        description: 'A complete category',
        status: ProductStatus.ARCHIVED,
        image: 'https://example.com/image.jpg',
      });

      trackCategory(result.id);

      expect(result.name).toBe('Full Category');
      expect(result.slug).toBe('custom-slug');
      expect(result.description).toBe('A complete category');
      expect(result.status).toBe(ProductStatus.ARCHIVED);
    });

    it('should create nested categories (3 levels deep)', async () => {
      // Level 1: Root
      const root = await service.create(testTenantId, {
        name: 'Root Category',
      });
      trackCategory(root.id);

      // Level 2: Child
      const child = await service.create(testTenantId, {
        name: 'Child Category',
        parentId: root.id,
      });
      trackCategory(child.id);

      // Level 3: Grandchild
      const grandchild = await service.create(testTenantId, {
        name: 'Grandchild Category',
        parentId: child.id,
      });
      trackCategory(grandchild.id);

      expect(grandchild.parent?.id).toBe(child.id);
      expect(grandchild.parent?.name).toBe('Child Category');
    });

    // ─── Edge Cases ────────────────────────────────────────────────────────────

    it('should handle special characters in name', async () => {
      const result = await service.create(testTenantId, {
        name: 'Category with Spëcial Ch@racters & Symbols (Test)',
      });
      trackCategory(result.id);

      expect(result.name).toBe(
        'Category with Spëcial Ch@racters & Symbols (Test)',
      );
      // Slug should sanitize special characters (diacritics like ë are removed)
      expect(result.slug).toMatch(/^category-with-s.*-symbols-test/);
    });

    it('should handle very long names (max length)', async () => {
      const longName = 'A'.repeat(200); // Near max length
      const result = await service.create(testTenantId, {
        name: longName,
      });
      trackCategory(result.id);

      expect(result.name).toBe(longName);
    });

    it('should handle empty description', async () => {
      const result = await service.create(testTenantId, {
        name: 'No Description Category',
        description: '',
      });
      trackCategory(result.id);

      expect(result.description).toBe('');
    });

    // ─── Slug Uniqueness ───────────────────────────────────────────────────────

    it('should auto-increment slugs for same-name categories', async () => {
      const name = `Duplicate Name ${Date.now()}`;

      const first = await service.create(testTenantId, { name });
      const second = await service.create(testTenantId, { name });
      const third = await service.create(testTenantId, { name });

      trackCategory(first.id);
      trackCategory(second.id);
      trackCategory(third.id);

      // Slugs should be unique
      expect(new Set([first.slug, second.slug, third.slug]).size).toBe(3);
      expect(second.slug).toContain('-1');
      expect(third.slug).toContain('-2');
    });

    it('should allow same slug in different tenants', async () => {
      const sameName = `Cross Tenant Category ${Date.now()}`;

      const tenant1Cat = await service.create(testTenantId, { name: sameName });
      const tenant2Cat = await service.create(secondTenantId, {
        name: sameName,
      });

      trackCategory(tenant1Cat.id);
      trackCategory(tenant2Cat.id);

      // Same slug is OK because different tenants
      expect(tenant1Cat.slug).toBe(tenant2Cat.slug);
    });

    // ─── Error Scenarios ───────────────────────────────────────────────────────

    it('should throw NotFoundException for non-existent parent', async () => {
      await expect(
        service.create(testTenantId, {
          name: 'Orphan',
          parentId: '00000000-0000-0000-0000-000000000000',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for parent from different tenant', async () => {
      // Create category in tenant 1
      const tenant1Cat = await service.create(testTenantId, {
        name: 'Tenant 1 Category',
      });
      trackCategory(tenant1Cat.id);

      // Try to use it as parent in tenant 2 - should fail!
      await expect(
        service.create(secondTenantId, {
          name: 'Cross Tenant Child',
          parentId: tenant1Cat.id, // Wrong tenant!
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND ALL - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll - Standard Level', () => {
    const setupCategoryIds: string[] = [];

    beforeAll(async () => {
      // Create test categories for findAll tests
      for (let i = 1; i <= 15; i++) {
        const cat = await service.create(testTenantId, {
          name: `FindAll Test Category ${i}`,
          status: i % 2 === 0 ? ProductStatus.ACTIVE : ProductStatus.ARCHIVED,
        });
        setupCategoryIds.push(cat.id);
      }
    });

    afterAll(() => {
      // Categories will be cleaned up in main afterAll
      createdCategoryIds.push(...setupCategoryIds);
    });

    // ─── Pagination Tests ──────────────────────────────────────────────────────

    it('should paginate correctly (page 1)', async () => {
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 5,
      });

      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(5);
    });

    it('should paginate correctly (page 2)', async () => {
      const page1 = await service.findAll(testTenantId, { page: 1, limit: 5 });
      const page2 = await service.findAll(testTenantId, { page: 2, limit: 5 });

      // Different data on different pages
      const page1Ids = page1.data.map((c) => c.id);
      const page2Ids = page2.data.map((c) => c.id);

      // No overlap between pages
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should return empty on out-of-range page', async () => {
      const result = await service.findAll(testTenantId, {
        page: 9999,
        limit: 10,
      });

      expect(result.data.length).toBe(0);
      expect(result.meta.totalPages).toBeGreaterThan(0);
    });

    // ─── Filtering Tests ───────────────────────────────────────────────────────

    it('should filter by ACTIVE status', async () => {
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 100,
        status: ProductStatus.ACTIVE,
      });

      result.data.forEach((cat) => {
        expect(cat.status).toBe(ProductStatus.ACTIVE);
      });
    });

    it('should filter by ARCHIVED status', async () => {
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 100,
        status: ProductStatus.ARCHIVED,
      });

      result.data.forEach((cat) => {
        expect(cat.status).toBe(ProductStatus.ARCHIVED);
      });
    });

    it('should search by partial name match', async () => {
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 100,
        search: 'FindAll Test',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((cat) => {
        expect(cat.name.toLowerCase()).toContain('findall test');
      });
    });

    it('should search case-insensitively', async () => {
      const upper = await service.findAll(testTenantId, {
        page: 1,
        limit: 100,
        search: 'FINDALL',
      });

      const lower = await service.findAll(testTenantId, {
        page: 1,
        limit: 100,
        search: 'findall',
      });

      expect(upper.meta.total).toBe(lower.meta.total);
    });

    // ─── Multi-Tenant Isolation ────────────────────────────────────────────────

    it('should NOT return categories from other tenants', async () => {
      const result = await service.findAll(testTenantId, {
        page: 1,
        limit: 1000,
      });

      result.data.forEach((cat) => {
        expect(cat.tenantId).toBe(testTenantId);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND ONE - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne - Standard Level', () => {
    let testCategory: { id: string; slug: string };

    beforeAll(async () => {
      const cat = await service.create(testTenantId, {
        name: `FindOne Test ${Date.now()}`,
      });
      testCategory = { id: cat.id, slug: cat.slug };
      createdCategoryIds.push(cat.id);
    });

    it('should find by UUID', async () => {
      const result = await service.findOne(testTenantId, testCategory.id);
      expect(result.id).toBe(testCategory.id);
    });

    it('should find by slug', async () => {
      const result = await service.findOne(testTenantId, testCategory.slug);
      expect(result.slug).toBe(testCategory.slug);
    });

    it('should include parent relation when exists', async () => {
      const parent = await service.create(testTenantId, {
        name: 'Parent For FindOne',
      });
      const child = await service.create(testTenantId, {
        name: 'Child For FindOne',
        parentId: parent.id,
      });
      createdCategoryIds.push(parent.id, child.id);

      const result = await service.findOne(testTenantId, child.id);

      expect(result.parent).toBeDefined();
      expect(result.parent?.id).toBe(parent.id);
    });

    it('should include children relation', async () => {
      const parent = await service.create(testTenantId, {
        name: 'Parent With Children',
      });
      const child1 = await service.create(testTenantId, {
        name: 'Child 1',
        parentId: parent.id,
      });
      const child2 = await service.create(testTenantId, {
        name: 'Child 2',
        parentId: parent.id,
      });
      createdCategoryIds.push(parent.id, child1.id, child2.id);

      const result = await service.findOne(testTenantId, parent.id);

      expect(result.children).toBeDefined();
      expect(result.children.length).toBe(2);
    });

    // ─── Multi-Tenant Isolation ────────────────────────────────────────────────

    it('should NOT find category from different tenant by ID', async () => {
      await expect(
        service.findOne(secondTenantId, testCategory.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT find category from different tenant by slug', async () => {
      await expect(
        service.findOne(secondTenantId, testCategory.slug),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update - Standard Level', () => {
    let categoryToUpdate: string;
    let parentCategory: string;

    beforeEach(async () => {
      const cat = await service.create(testTenantId, {
        name: `Update Test ${Date.now()}`,
      });
      categoryToUpdate = cat.id;
      createdCategoryIds.push(cat.id);

      const parent = await service.create(testTenantId, {
        name: `Parent ${Date.now()}`,
      });
      parentCategory = parent.id;
      createdCategoryIds.push(parent.id);
    });

    it('should update only provided fields (partial update)', async () => {
      const original = await service.findOne(testTenantId, categoryToUpdate);

      const result = await service.update(testTenantId, categoryToUpdate, {
        description: 'New description only',
      });

      // Name unchanged
      expect(result.name).toBe(original.name);
      // Description changed
      expect(result.description).toBe('New description only');
    });

    it('should update parent relationship', async () => {
      const result = await service.update(testTenantId, categoryToUpdate, {
        parentId: parentCategory,
      });

      expect(result.parentId).toBe(parentCategory);
      expect(result.parent?.id).toBe(parentCategory);
    });

    it('should regenerate slug when name changes', async () => {
      const original = await service.findOne(testTenantId, categoryToUpdate);

      const result = await service.update(testTenantId, categoryToUpdate, {
        name: 'Completely New Name',
      });

      expect(result.slug).not.toBe(original.slug);
      expect(result.slug).toBe('completely-new-name');
    });

    // ─── Error Cases ───────────────────────────────────────────────────────────

    it('should throw BadRequestException for self-parent', async () => {
      await expect(
        service.update(testTenantId, categoryToUpdate, {
          parentId: categoryToUpdate, // Self-reference!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for circular reference', async () => {
      // Create A -> B -> C
      const catA = await service.create(testTenantId, { name: 'Cat A' });
      const catB = await service.create(testTenantId, {
        name: 'Cat B',
        parentId: catA.id,
      });
      const catC = await service.create(testTenantId, {
        name: 'Cat C',
        parentId: catB.id,
      });
      createdCategoryIds.push(catA.id, catB.id, catC.id);

      // Try to set A's parent as C (would create: C -> A -> B -> C loop)
      await expect(
        service.update(testTenantId, catA.id, {
          parentId: catC.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove - Standard Level', () => {
    it('should soft delete (not hard delete)', async () => {
      const cat = await service.create(testTenantId, {
        name: `Soft Delete Test ${Date.now()}`,
      });

      await service.remove(testTenantId, cat.id);

      // Direct DB query should find it with deletedAt set
      const inDb = await prisma.productCategory.findUnique({
        where: { id: cat.id },
      });

      expect(inDb).not.toBeNull();
      expect(inDb?.deletedAt).not.toBeNull();
    });

    it('should NOT return soft-deleted in findAll', async () => {
      const cat = await service.create(testTenantId, {
        name: `Hidden Category ${Date.now()}`,
      });
      await service.remove(testTenantId, cat.id);

      const allCategories = await service.findAll(testTenantId, {
        page: 1,
        limit: 1000,
      });

      const found = allCategories.data.find((c) => c.id === cat.id);
      expect(found).toBeUndefined();
    });

    it('should NOT return soft-deleted in findOne', async () => {
      const cat = await service.create(testTenantId, {
        name: `Not Findable ${Date.now()}`,
      });
      const slug = cat.slug;
      await service.remove(testTenantId, cat.id);

      await expect(service.findOne(testTenantId, cat.id)).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findOne(testTenantId, slug)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ─── Business Rules ────────────────────────────────────────────────────────

    it('should throw ConflictException when has children', async () => {
      const parent = await service.create(testTenantId, {
        name: 'Parent To Delete',
      });
      const child = await service.create(testTenantId, {
        name: 'Child Blocking Delete',
        parentId: parent.id,
      });
      createdCategoryIds.push(parent.id, child.id);

      await expect(service.remove(testTenantId, parent.id)).rejects.toThrow(
        ConflictException,
      );
    });

    // ─── Multi-Tenant Isolation ────────────────────────────────────────────────

    it('should NOT allow deleting category from different tenant', async () => {
      const cat = await service.create(testTenantId, {
        name: `Tenant 1 Only ${Date.now()}`,
      });
      createdCategoryIds.push(cat.id);

      // Try to delete from wrong tenant
      await expect(service.remove(secondTenantId, cat.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATE CATEGORY IDS - STANDARD LEVEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateCategoryIds - Standard Level', () => {
    it('should pass for all valid IDs', async () => {
      const cat1 = await service.create(testTenantId, { name: 'Valid 1' });
      const cat2 = await service.create(testTenantId, { name: 'Valid 2' });
      createdCategoryIds.push(cat1.id, cat2.id);

      await expect(
        service.validateCategoryIds(testTenantId, [cat1.id, cat2.id]),
      ).resolves.not.toThrow();
    });

    it('should throw if any ID is invalid', async () => {
      const validCat = await service.create(testTenantId, {
        name: 'One Valid',
      });
      createdCategoryIds.push(validCat.id);

      await expect(
        service.validateCategoryIds(testTenantId, [
          validCat.id,
          '00000000-0000-0000-0000-000000000000', // Invalid
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw for IDs from different tenant', async () => {
      const wrongTenantCat = await service.create(secondTenantId, {
        name: 'Wrong Tenant',
      });
      createdCategoryIds.push(wrongTenantCat.id);

      await expect(
        service.validateCategoryIds(testTenantId, [wrongTenantCat.id]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
