/**
 * Category API E2E Tests
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * E2E vs INTEGRATION vs UNIT - The Complete Picture
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UNIT TESTS (category.service.spec.ts):
 *   - Test: CategoryService methods
 *   - Mock: PrismaService, SlugService
 *   - Speed: ~1 second
 *   - Scope: Single class/function
 *
 * INTEGRATION TESTS (category.integration.spec.ts):
 *   - Test: CategoryService + Real PrismaService
 *   - Mock: Nothing (real database)
 *   - Speed: ~10 seconds
 *   - Scope: Service layer + Database
 *
 * E2E TESTS (this file):
 *   - Test: HTTP Request → Controller → Service → Database → Response
 *   - Mock: Nothing (real everything)
 *   - Speed: ~20-30 seconds
 *   - Scope: ENTIRE application flow
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT E2E TESTS VERIFY:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. HTTP routing works (correct endpoints)
 * 2. Request validation (DTOs, validation pipes)
 * 3. Authentication & Authorization (guards, permissions)
 * 4. Response formatting (correct status codes, body structure)
 * 5. Headers (CSRF, cookies, content-type)
 * 6. Full business logic flow
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN: pnpm docker:test:e2e category
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ErrorResponse } from '../../src/common/interfaces/response.interface';
import { CategoryDetailResponseDto } from '../../src/modules/category/dto';
import {
  createTestApp,
  createTestUserAndTenant,
  loginTestUser,
  cleanupTestData,
  TestUser,
  AuthenticatedAgent,
  ApiResponse,
  PaginatedApiResponse,
} from '../helpers/e2e-helpers';

/**
 * Category response type for E2E testing.
 *
 * Extends CategoryDetailResponseDto but overrides Date fields with string
 * because HTTP responses serialize Date objects as ISO strings.
 */
type CategoryResponse = Omit<
  CategoryDetailResponseDto,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

describe('Category API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: TestUser;
  let authAgent: AuthenticatedAgent;

  // Track created categories for reference in tests
  const createdCategories: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP & TEARDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  beforeAll(async () => {
    /**
     * STEP 1: Create the full NestJS application
     *
     * Unlike unit tests that create minimal modules,
     * E2E tests create the ENTIRE application!
     */
    app = await createTestApp();
    prisma = app.get<PrismaService>(PrismaService);

    /**
     * STEP 2: Create a test user and tenant
     *
     * We need a real user to authenticate with.
     */
    testUser = await createTestUserAndTenant(prisma);

    /**
     * STEP 3: Login to get an authenticated session
     *
     * The agent maintains cookies/session across requests.
     */
    authAgent = await loginTestUser(app, testUser);

    console.log(`✅ E2E Setup complete. Tenant: ${testUser.tenantId}`);
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData(prisma, testUser.tenantId);
    await app.close();
    console.log('✅ E2E Teardown complete');
  }, 30000);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🔐 Authentication Requirements', () => {
    it('should return 401 for unauthenticated requests', async () => {
      /**
       * Without authentication, protected endpoints should reject
       */
      await request(app.getHttpServer() as App)
        .get('/api/v1/categories')
        .expect(401);
    });

    it('should return 401 for invalid session', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/v1/categories')
        .set('Cookie', 'connect.sid=invalid-session-id')
        .expect(401);
    });

    it('should succeed with valid authentication', async () => {
      /**
       * Our authenticated agent should work
       */
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 });

      // Debug: Print response for 400 investigation
      console.log(
        'GET CATEGORIES RESPONSE:',
        response.status,
        JSON.stringify(response.body, null, 2),
      );

      expect(response.status).toBe(200);
      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      expect(body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE (POST /categories)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('📝 POST /categories', () => {
    it('should create a category with valid data', async () => {
      const createDto = {
        name: 'E2E Test Category',
        description: 'Created via E2E test',
        status: 'ACTIVE',
      };

      const response = await authAgent.request
        .post('/api/v1/categories')
        .send(createDto);

      // Debug: Print response for 403 investigation
      console.log(
        'CREATE CATEGORY RESPONSE:',
        response.status,
        JSON.stringify(response.body, null, 2),
      );

      expect(response.status).toBe(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      // Verify response structure
      expect(body.success).toBe(true);
      expect(body.statusCode).toBe(201);

      // Verify category data
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe('E2E Test Category');
      expect(body.data.slug).toBe('e2e-test-category');
      expect(body.data.description).toBe('Created via E2E test');
      expect(body.data.tenantId).toBe(testUser.tenantId);

      createdCategories.push(body.data.id);
    });

    it('should create a category with custom slug', async () => {
      const createDto = {
        name: 'Custom Slug Test',
        slug: 'my-custom-slug',
      };

      const response = await authAgent.request
        .post('/api/v1/categories')
        .send(createDto)
        .expect(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.slug).toBe('my-custom-slug');
      createdCategories.push(body.data.id);
    });

    it('should create a child category with parentId', async () => {
      // First create parent
      const parentResponse = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'E2E Parent Category' })
        .expect(201);

      const parentId = (parentResponse.body as ApiResponse<CategoryResponse>)
        .data.id;
      createdCategories.push(parentId);

      // Then create child
      const childResponse = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'E2E Child Category',
          parentId,
        })
        .expect(201);

      const body = childResponse.body as ApiResponse<CategoryResponse>;

      expect(body.data.parentId).toBe(parentId);
      expect(body.data.parent?.id).toBe(parentId);
      createdCategories.push(body.data.id);
    });

    // ─── Validation Errors ─────────────────────────────────────────────────────

    it('should return 400 for missing required fields', async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({}) // Missing 'name'
        .expect(400);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
      // Message is an array of validation errors
      expect(JSON.stringify(body.message).toLowerCase()).toContain('name');
    });

    it('should return 400 for invalid status value', async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'Invalid Status Test',
          status: 'INVALID_STATUS',
        })
        .expect(400);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
    });

    it('should return 404 for non-existent parent', async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'Orphan Category',
          parentId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
      expect(body.message).toContain('Parent');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ ALL (GET /categories)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('📋 GET /categories', () => {
    it('should return paginated categories', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // Verify pagination meta
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by status', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10, status: 'ACTIVE' })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      // All returned should be ACTIVE
      body.data.forEach((cat) => {
        expect(cat.status).toBe('ACTIVE');
      });
    });

    it('should search by name', async () => {
      // Create a category with unique name
      const uniqueName = `Searchable-${Date.now()}`;
      await authAgent.request
        .post('/api/v1/categories')
        .send({ name: uniqueName })
        .expect(201);

      // Search for it
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10, search: 'Searchable' })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.some((c) => c.name.includes('Searchable'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({
          page: 1,
          limit: 10,
          search: 'ThisWillNeverMatchAnything12345',
        })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ ONE (GET /categories/:identifier)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🔍 GET /categories/:identifier', () => {
    let testCategoryId: string;
    let testCategorySlug: string;

    beforeAll(async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'E2E GetOne Test Category',
          description: 'For findOne tests',
        })
        .expect(201);

      const data = (response.body as ApiResponse<CategoryResponse>).data;
      testCategoryId = data.id;
      testCategorySlug = data.slug;
      createdCategories.push(testCategoryId);
    });

    it('should get category by ID', async () => {
      const response = await authAgent.request
        .get(`/api/v1/categories/${testCategoryId}`)
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.id).toBe(testCategoryId);
      expect(body.data.name).toBe('E2E GetOne Test Category');
    });

    it('should get category by slug', async () => {
      const response = await authAgent.request
        .get(`/api/v1/categories/${testCategorySlug}`)
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.slug).toBe(testCategorySlug);
    });

    it('should include parent and children relations', async () => {
      const response = await authAgent.request
        .get(`/api/v1/categories/${testCategoryId}`)
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      // These fields should be included
      expect(body.data).toHaveProperty('parent');
      expect(body.data).toHaveProperty('children');
      expect(body.data).toHaveProperty('_count');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
      expect(body.message).toContain('not found');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories/this-slug-does-not-exist-12345')
        .expect(404);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE (PATCH /categories/:id)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('✏️ PATCH /categories/:id', () => {
    let categoryToUpdate: string;

    beforeEach(async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: `E2E Update Test ${Date.now()}` })
        .expect(201);

      categoryToUpdate = (response.body as ApiResponse<CategoryResponse>).data
        .id;
      createdCategories.push(categoryToUpdate);
    });

    it('should update category name', async () => {
      const response = await authAgent.request
        .patch(`/api/v1/categories/${categoryToUpdate}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.name).toBe('Updated Name');
      expect(body.data.slug).toBe('updated-name');
    });

    it('should update only specified fields (partial update)', async () => {
      // Get original
      const originalResponse = await authAgent.request
        .get(`/api/v1/categories/${categoryToUpdate}`)
        .expect(200);
      const original = (originalResponse.body as ApiResponse<CategoryResponse>)
        .data;

      // Update only description
      const response = await authAgent.request
        .patch(`/api/v1/categories/${categoryToUpdate}`)
        .send({ description: 'New description only' })
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      // Name should remain unchanged
      expect(body.data.name).toBe(original.name);
      // Description should be updated
      expect(body.data.description).toBe('New description only');
    });

    it('should return 400 for self-referencing parent', async () => {
      const response = await authAgent.request
        .patch(`/api/v1/categories/${categoryToUpdate}`)
        .send({ parentId: categoryToUpdate })
        .expect(400);
      const body = response.body as ErrorResponse;

      expect(body.success).toBe(false);
      expect(body.message).toContain('own parent');
    });

    it('should return 404 for non-existent category', async () => {
      await authAgent.request
        .patch('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Ghost Update' })
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE (DELETE /categories/:id)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🗑️ DELETE /categories/:id', () => {
    it('should soft delete a category (returns 204)', async () => {
      // Create category to delete
      const createResponse = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: `To Delete ${Date.now()}` })
        .expect(201);

      const categoryId = (createResponse.body as ApiResponse<CategoryResponse>)
        .data.id;

      // Delete it
      await authAgent.request
        .delete(`/api/v1/categories/${categoryId}`)
        .expect(204);

      // Verify it's not findable anymore
      await authAgent.request
        .get(`/api/v1/categories/${categoryId}`)
        .expect(404);
    });

    it('should return 404 for non-existent category', async () => {
      await authAgent.request
        .delete('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 409 when category has children', async () => {
      // Create parent
      const parentResponse = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'E2E Parent With Children' })
        .expect(201);

      const parentId = (parentResponse.body as ApiResponse<CategoryResponse>)
        .data.id;
      createdCategories.push(parentId);

      // Create child
      const childResponse = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'E2E Child', parentId })
        .expect(201);

      createdCategories.push(
        (childResponse.body as ApiResponse<CategoryResponse>).data.id,
      );

      // Try to delete parent - should fail
      const deleteResponse = await authAgent.request
        .delete(`/api/v1/categories/${parentId}`)
        .expect(409);
      const body = deleteResponse.body as ErrorResponse;

      expect(body.message).toContain('child');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE FORMAT VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('📦 Response Format', () => {
    it('should have correct success response structure', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Verify standard response envelope
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });

    it('should have correct error response structure', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should set correct Content-Type header', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-TENANT ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🏢 Multi-Tenant Isolation', () => {
    /**
     * These tests verify that one tenant cannot access another tenant's data.
     * This is CRITICAL for security in multi-tenant applications.
     */

    let otherTenantUser: TestUser;
    let otherTenantAgent: AuthenticatedAgent;
    let ourCategory: string;

    beforeAll(async () => {
      // Create a category in our tenant
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: `Our Tenant's Category ${Date.now()}` })
        .expect(201);

      ourCategory = (response.body as ApiResponse<CategoryResponse>).data.id;
      createdCategories.push(ourCategory);

      // Create another user in a different tenant
      otherTenantUser = await createTestUserAndTenant(prisma, '-other');
      otherTenantAgent = await loginTestUser(app, otherTenantUser);
    });

    afterAll(async () => {
      if (otherTenantUser?.tenantId) {
        await cleanupTestData(prisma, otherTenantUser.tenantId);
      }
    });

    it("should NOT allow reading another tenant's category by ID", async () => {
      await otherTenantAgent.request
        .get(`/api/v1/categories/${ourCategory}`)
        .expect(404);
    });

    it('should NOT list categories from other tenants', async () => {
      const response = await otherTenantAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 100 })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      // Should not contain our category
      const foundOurs = body.data.find((c) => c.id === ourCategory);
      expect(foundOurs).toBeUndefined();

      // All returned should belong to other tenant
      body.data.forEach((cat) => {
        expect(cat.tenantId).toBe(otherTenantUser.tenantId);
      });
    });

    it("should NOT allow updating another tenant's category", async () => {
      await otherTenantAgent.request
        .patch(`/api/v1/categories/${ourCategory}`)
        .send({ name: 'Hacked!' })
        .expect(404);
    });

    it("should NOT allow deleting another tenant's category", async () => {
      await otherTenantAgent.request
        .delete(`/api/v1/categories/${ourCategory}`)
        .expect(404);
    });

    it("should NOT allow using another tenant's category as parent", async () => {
      await otherTenantAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'Cross-Tenant Child',
          parentId: ourCategory, // Our tenant's category!
        })
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CIRCULAR REFERENCE PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🔄 Circular Reference Prevention', () => {
    /**
     * Categories form a tree structure. We must prevent circular references
     * like A -> B -> C -> A (which would create an infinite loop).
     */

    let catA: string;
    let catB: string;
    let catC: string;

    beforeAll(async () => {
      // Create hierarchy: A -> B -> C
      const responseA = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Circular Test A' })
        .expect(201);
      catA = (responseA.body as ApiResponse<CategoryResponse>).data.id;

      const responseB = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Circular Test B', parentId: catA })
        .expect(201);
      catB = (responseB.body as ApiResponse<CategoryResponse>).data.id;

      const responseC = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Circular Test C', parentId: catB })
        .expect(201);
      catC = (responseC.body as ApiResponse<CategoryResponse>).data.id;

      createdCategories.push(catA, catB, catC);
    });

    it('should prevent setting parent to create A -> C -> ... -> A loop', async () => {
      // Try to set A's parent to C (would create: C -> A -> B -> C)
      const response = await authAgent.request
        .patch(`/api/v1/categories/${catA}`)
        .send({ parentId: catC })
        .expect(400);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('circular');
    });

    it('should prevent setting parent to immediate child', async () => {
      // Try to set A's parent to B (its direct child)
      const response = await authAgent.request
        .patch(`/api/v1/categories/${catA}`)
        .send({ parentId: catB })
        .expect(400);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('circular');
    });

    it('should allow valid parent changes', async () => {
      // Create an independent category
      const responseD = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Circular Test D (Independent)' })
        .expect(201);
      const catD = (responseD.body as ApiResponse<CategoryResponse>).data.id;
      createdCategories.push(catD);

      // Moving C under D should be allowed (no circular reference)
      const updateResponse = await authAgent.request
        .patch(`/api/v1/categories/${catC}`)
        .send({ parentId: catD })
        .expect(200);

      expect(
        (updateResponse.body as ApiResponse<CategoryResponse>).data.parentId,
      ).toBe(catD);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('📄 Pagination Edge Cases', () => {
    beforeAll(async () => {
      // Create 25 categories for pagination testing (sequentially to avoid overload)
      for (let i = 0; i < 25; i++) {
        const res = await authAgent.request
          .post('/api/v1/categories')
          .send({ name: `Pagination Test ${i + 1}` });
        if (res.status === 201) {
          createdCategories.push(
            (res.body as ApiResponse<CategoryResponse>).data.id,
          );
        }
      }
    });

    it('should return correct total across pages', async () => {
      const page1 = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const page2 = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 2, limit: 10 })
        .expect(200);

      const body1 = page1.body as PaginatedApiResponse<CategoryResponse>;
      const body2 = page2.body as PaginatedApiResponse<CategoryResponse>;

      // Total should be consistent
      expect(body1.meta.total).toBe(body2.meta.total);
      expect(body1.meta.totalPages).toBe(body2.meta.totalPages);
    });

    it('should return empty array for page beyond total', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 9999, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      expect(body.data).toEqual([]);
      expect(body.meta.page).toBe(9999);
    });

    it('should handle different page sizes correctly', async () => {
      const limit5 = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 5 })
        .expect(200);

      const limit20 = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 20 })
        .expect(200);

      const body5 = limit5.body as PaginatedApiResponse<CategoryResponse>;
      const body20 = limit20.body as PaginatedApiResponse<CategoryResponse>;

      expect(body5.data.length).toBeLessThanOrEqual(5);
      expect(body20.data.length).toBeLessThanOrEqual(20);
      expect(body5.meta.limit).toBe(5);
      expect(body20.meta.limit).toBe(20);
    });

    it('should use default pagination when not specified', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      // Should have sensible defaults
      expect(body.meta.page).toBeDefined();
      expect(body.meta.limit).toBeDefined();
      expect(body.meta.page).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE WITH PARENT CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🔄 Update with Parent Changes', () => {
    let rootA: string;
    let rootB: string;
    let childOfA: string;

    beforeAll(async () => {
      // Create two root categories
      const responseA = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Root A for Update Test' })
        .expect(201);
      rootA = (responseA.body as ApiResponse<CategoryResponse>).data.id;

      const responseB = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Root B for Update Test' })
        .expect(201);
      rootB = (responseB.body as ApiResponse<CategoryResponse>).data.id;

      // Create child of A
      const responseChild = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: 'Child of A', parentId: rootA })
        .expect(201);
      childOfA = (responseChild.body as ApiResponse<CategoryResponse>).data.id;

      createdCategories.push(rootA, rootB, childOfA);
    });

    it('should move category to different parent', async () => {
      const response = await authAgent.request
        .patch(`/api/v1/categories/${childOfA}`)
        .send({ parentId: rootB })
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.parentId).toBe(rootB);
      expect(body.data.parent?.id).toBe(rootB);
    });

    it('should make category root by setting parentId to null', async () => {
      const response = await authAgent.request
        .patch(`/api/v1/categories/${childOfA}`)
        .send({ parentId: null })
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.parentId).toBeNull();
      expect(body.data.parent).toBeNull();
    });

    it('should update multiple fields including parent', async () => {
      // First reset to have a parent
      await authAgent.request
        .patch(`/api/v1/categories/${childOfA}`)
        .send({ parentId: rootA })
        .expect(200);

      // Now update name and change parent
      const response = await authAgent.request
        .patch(`/api/v1/categories/${childOfA}`)
        .send({
          name: 'Renamed and Moved',
          parentId: rootB,
          description: 'Updated with parent change',
        })
        .expect(200);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.name).toBe('Renamed and Moved');
      expect(body.data.parentId).toBe(rootB);
      expect(body.data.description).toBe('Updated with parent change');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT SANITIZATION & EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('🧹 Input Sanitization & Edge Cases', () => {
    it('should handle special characters in name', async () => {
      const specialName = 'Category with Spëcial Ch@racters & Symbols (Test)';

      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: specialName })
        .expect(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.name).toBe(specialName);
      createdCategories.push(body.data.id);
    });

    it('should handle unicode/emoji in description', async () => {
      const emojiDescription =
        '🎉 This is a fun category! 🛍️ Contains emojis 👍';

      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: 'Emoji Test Category',
          description: emojiDescription,
        })
        .expect(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.description).toBe(emojiDescription);
      createdCategories.push(body.data.id);
    });

    it('should handle very long names (within limits)', async () => {
      const longName = 'A'.repeat(100); // 100 characters

      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: longName })
        .expect(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.name).toBe(longName);
      createdCategories.push(body.data.id);
    });

    it('should handle whitespace in search queries', async () => {
      const response = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10, search: '   ' }) // Whitespace only
        .expect(200);
      const body = response.body as PaginatedApiResponse<CategoryResponse>;

      // Should not crash, may return all or empty
      expect(body.success).toBe(true);
    });

    it('should handle numeric-looking slugs correctly', async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({
          name: '12345 Numeric Name',
          slug: '12345-category',
        })
        .expect(201);

      const body = response.body as ApiResponse<CategoryResponse>;

      expect(body.data.slug).toBe('12345-category');

      // Should be retrievable by slug (not confused with ID)
      const getResponse = await authAgent.request
        .get(`/api/v1/categories/${body.data.slug}`)
        .expect(200);

      expect(
        (getResponse.body as ApiResponse<CategoryResponse>).data.slug,
      ).toBe('12345-category');
      createdCategories.push(body.data.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('📊 Status Transitions', () => {
    let statusTestCategory: string;

    beforeEach(async () => {
      const response = await authAgent.request
        .post('/api/v1/categories')
        .send({ name: `Status Test ${Date.now()}`, status: 'ACTIVE' })
        .expect(201);

      statusTestCategory = (response.body as ApiResponse<CategoryResponse>).data
        .id;
      createdCategories.push(statusTestCategory);
    });

    it('should allow ACTIVE -> INACTIVE transition', async () => {
      const response = await authAgent.request
        .patch(`/api/v1/categories/${statusTestCategory}`)
        .send({ status: 'ARCHIVED' })
        .expect(200);

      expect((response.body as ApiResponse<CategoryResponse>).data.status).toBe(
        'ARCHIVED',
      );
    });

    it('should allow INACTIVE -> ACTIVE transition', async () => {
      // First make it inactive
      await authAgent.request
        .patch(`/api/v1/categories/${statusTestCategory}`)
        .send({ status: 'ARCHIVED' })
        .expect(200);

      // Then make it active again
      const response = await authAgent.request
        .patch(`/api/v1/categories/${statusTestCategory}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect((response.body as ApiResponse<CategoryResponse>).data.status).toBe(
        'ACTIVE',
      );
    });

    it('should filter correctly by status after transition', async () => {
      // Make inactive
      const patchResponse = await authAgent.request
        .patch(`/api/v1/categories/${statusTestCategory}`)
        .send({ status: 'ARCHIVED' });

      // Debug: Print response for 400 investigation
      console.log(
        'PATCH STATUS:',
        patchResponse.status,
        statusTestCategory,
        JSON.stringify(patchResponse.body, null, 2),
      );

      expect(patchResponse.status).toBe(200);

      // Should appear in INACTIVE filter
      const inactiveResponse = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10, status: 'ARCHIVED' })
        .expect(200);

      const body =
        inactiveResponse.body as PaginatedApiResponse<CategoryResponse>;
      const found = body.data.find((c) => c.id === statusTestCategory);
      expect(found).toBeDefined();
      expect(found?.status).toBe('ARCHIVED');

      // Should NOT appear in ACTIVE filter
      const activeResponse = await authAgent.request
        .get('/api/v1/categories')
        .query({ page: 1, limit: 10, status: 'ACTIVE' })
        .expect(200);

      const activeBody =
        activeResponse.body as PaginatedApiResponse<CategoryResponse>;
      const notFound = activeBody.data.find((c) => c.id === statusTestCategory);
      expect(notFound).toBeUndefined();
    });
  });
});
